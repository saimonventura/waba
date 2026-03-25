// ---------------------------------------------------------------------------
// @saimonventura/waba — WhatsApp Flows Data Endpoint (E2E Encryption)
// Handles decryption of Flow requests and encryption of responses.
// Uses node:crypto only — zero external dependencies.
// ---------------------------------------------------------------------------

import { createDecipheriv, createCipheriv, privateDecrypt, randomBytes, constants } from "node:crypto"

export interface FlowDataRequest {
  encrypted_flow_data: string
  encrypted_aes_key: string
  initial_vector: string
}

export interface FlowDecryptedData {
  flow_token: string
  action: string
  screen: string
  data: Record<string, any>
  version: string
  [key: string]: any
}

export interface FlowResponse {
  screen: string
  data: Record<string, any>
}

export interface FlowEndpointConfig {
  privateKey: string | Buffer
  passphrase?: string
  onFlow: (data: FlowDecryptedData) => FlowResponse | Promise<FlowResponse>
}

/**
 * Decrypt the AES key using RSA-OAEP with the private key.
 */
function decryptAesKey(encryptedAesKey: string, privateKey: string | Buffer, passphrase?: string): Buffer {
  const encrypted = Buffer.from(encryptedAesKey, "base64")
  return privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
      ...(passphrase ? { passphrase } : {}),
    },
    encrypted,
  )
}

/**
 * Decrypt the flow data using AES-128-GCM.
 */
function decryptFlowData(encryptedData: string, aesKey: Buffer, iv: string): FlowDecryptedData {
  const encryptedBuffer = Buffer.from(encryptedData, "base64")
  const ivBuffer = Buffer.from(iv, "base64")

  // Last 16 bytes are the auth tag
  const tagLength = 16
  const encrypted = encryptedBuffer.subarray(0, encryptedBuffer.length - tagLength)
  const authTag = encryptedBuffer.subarray(encryptedBuffer.length - tagLength)

  const decipher = createDecipheriv("aes-128-gcm", aesKey, ivBuffer)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return JSON.parse(decrypted.toString("utf-8"))
}

/**
 * Encrypt the response using AES-128-GCM with a flipped IV.
 */
function encryptResponse(response: FlowResponse, aesKey: Buffer, iv: string): string {
  const ivBuffer = Buffer.from(iv, "base64")

  // Flip the IV for the response
  const flippedIv = Buffer.alloc(ivBuffer.length)
  for (let i = 0; i < ivBuffer.length; i++) {
    flippedIv[i] = ~ivBuffer[i] & 0xff
  }

  const cipher = createCipheriv("aes-128-gcm", aesKey, flippedIv)
  const responseJson = JSON.stringify(response)
  const encrypted = Buffer.concat([cipher.update(responseJson, "utf-8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([encrypted, authTag]).toString("base64")
}

/**
 * Create a handler for WhatsApp Flow Data Endpoint requests.
 *
 * Usage:
 * ```ts
 * const handler = handleFlowEndpoint({
 *   privateKey: fs.readFileSync("private.pem"),
 *   onFlow: async (data) => {
 *     return { screen: "RESULT", data: { status: "ok" } }
 *   },
 * })
 *
 * // Express
 * app.post("/flow", express.raw({ type: "*\/*" }), async (req, res) => {
 *   const result = await handler(req.body)
 *   res.json(result)
 * })
 * ```
 */
export function handleFlowEndpoint(config: FlowEndpointConfig) {
  return async (body: FlowDataRequest | string | Buffer): Promise<{ encrypted_response: string }> => {
    const request: FlowDataRequest = typeof body === "string" || Buffer.isBuffer(body)
      ? JSON.parse(body.toString())
      : body

    const aesKey = decryptAesKey(request.encrypted_aes_key, config.privateKey, config.passphrase)
    const decryptedData = decryptFlowData(request.encrypted_flow_data, aesKey, request.initial_vector)
    const response = await config.onFlow(decryptedData)
    const encryptedResponse = encryptResponse(response, aesKey, request.initial_vector)

    return { encrypted_response: encryptedResponse }
  }
}

export { decryptAesKey as _decryptAesKey, decryptFlowData as _decryptFlowData, encryptResponse as _encryptResponse }
