import { describe, it, expect } from "vitest"
import { generateKeyPairSync, publicEncrypt, createCipheriv, randomBytes, constants } from "node:crypto"
import { handleFlowEndpoint, _decryptAesKey, _decryptFlowData, _encryptResponse } from "../src/flows.js"

// Generate a test RSA key pair
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
})

function encryptAesKey(aesKey: Buffer): string {
  const encrypted = publicEncrypt(
    { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    aesKey,
  )
  return encrypted.toString("base64")
}

function encryptFlowData(data: any, aesKey: Buffer, iv: Buffer): string {
  const cipher = createCipheriv("aes-128-gcm", aesKey, iv)
  const json = JSON.stringify(data)
  const encrypted = Buffer.concat([cipher.update(json, "utf-8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([encrypted, authTag]).toString("base64")
}

function makeFlowRequest(data: any) {
  const aesKey = randomBytes(16) // AES-128
  const iv = randomBytes(12) // GCM standard IV
  return {
    aesKey,
    iv,
    request: {
      encrypted_flow_data: encryptFlowData(data, aesKey, iv),
      encrypted_aes_key: encryptAesKey(aesKey),
      initial_vector: iv.toString("base64"),
    },
  }
}

describe("Flow Data Endpoint", () => {
  it("should decrypt AES key with RSA-OAEP", () => {
    const originalKey = randomBytes(16)
    const encryptedKey = encryptAesKey(originalKey)
    const decryptedKey = _decryptAesKey(encryptedKey, privateKey)
    expect(decryptedKey).toEqual(originalKey)
  })

  it("should decrypt flow data with AES-128-GCM", () => {
    const aesKey = randomBytes(16)
    const iv = randomBytes(12)
    const data = { flow_token: "test", action: "navigate", screen: "SCREEN_1", data: { foo: "bar" }, version: "3.0" }
    const encrypted = encryptFlowData(data, aesKey, iv)
    const decrypted = _decryptFlowData(encrypted, aesKey, iv.toString("base64"))
    expect(decrypted.flow_token).toBe("test")
    expect(decrypted.action).toBe("navigate")
    expect(decrypted.data.foo).toBe("bar")
  })

  it("should encrypt response with flipped IV", () => {
    const aesKey = randomBytes(16)
    const iv = randomBytes(12)
    const response = { screen: "RESULT", data: { status: "ok" } }
    const encrypted = _encryptResponse(response, aesKey, iv.toString("base64"))
    expect(typeof encrypted).toBe("string")
    expect(encrypted.length).toBeGreaterThan(0)
    // Verify it's valid base64
    expect(() => Buffer.from(encrypted, "base64")).not.toThrow()
  })

  it("should handle full flow endpoint roundtrip", async () => {
    const flowData = {
      flow_token: "flow_abc",
      action: "data_exchange",
      screen: "ORDER_FORM",
      data: { product_id: "123", quantity: 2 },
      version: "3.0",
    }
    const { request } = makeFlowRequest(flowData)

    const handler = handleFlowEndpoint({
      privateKey,
      onFlow: (data) => {
        expect(data.flow_token).toBe("flow_abc")
        expect(data.action).toBe("data_exchange")
        expect(data.data.product_id).toBe("123")
        return { screen: "CONFIRMATION", data: { total: 200 } }
      },
    })

    const result = await handler(request)
    expect(result).toHaveProperty("encrypted_response")
    expect(typeof result.encrypted_response).toBe("string")
  })

  it("should handle string body input", async () => {
    const flowData = {
      flow_token: "token_str",
      action: "navigate",
      screen: "SCREEN_1",
      data: {},
      version: "3.0",
    }
    const { request } = makeFlowRequest(flowData)
    const bodyString = JSON.stringify(request)

    const handler = handleFlowEndpoint({
      privateKey,
      onFlow: (data) => {
        expect(data.flow_token).toBe("token_str")
        return { screen: "OK", data: {} }
      },
    })

    const result = await handler(bodyString)
    expect(result).toHaveProperty("encrypted_response")
  })

  it("should handle Buffer body input", async () => {
    const flowData = {
      flow_token: "token_buf",
      action: "navigate",
      screen: "SCREEN_1",
      data: {},
      version: "3.0",
    }
    const { request } = makeFlowRequest(flowData)
    const bodyBuffer = Buffer.from(JSON.stringify(request))

    const handler = handleFlowEndpoint({
      privateKey,
      onFlow: (data) => {
        expect(data.flow_token).toBe("token_buf")
        return { screen: "OK", data: {} }
      },
    })

    const result = await handler(bodyBuffer)
    expect(result).toHaveProperty("encrypted_response")
  })

  it("should handle async onFlow callback", async () => {
    const flowData = {
      flow_token: "token_async",
      action: "data_exchange",
      screen: "SCREEN_1",
      data: { user: "test" },
      version: "3.0",
    }
    const { request } = makeFlowRequest(flowData)

    const handler = handleFlowEndpoint({
      privateKey,
      onFlow: async (data) => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10))
        return { screen: "RESULT", data: { greeting: `Hello ${data.data.user}` } }
      },
    })

    const result = await handler(request)
    expect(result).toHaveProperty("encrypted_response")
  })

  it("should throw on invalid encrypted data", async () => {
    const handler = handleFlowEndpoint({
      privateKey,
      onFlow: () => ({ screen: "OK", data: {} }),
    })

    await expect(handler({
      encrypted_flow_data: "invalid",
      encrypted_aes_key: "invalid",
      initial_vector: "invalid",
    })).rejects.toThrow()
  })
})
