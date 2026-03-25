import { describe, it, expect, vi, beforeEach } from "vitest"
import { expressMiddleware } from "../src/middleware/express.js"
import { createHmac } from "node:crypto"

const VERIFY_TOKEN = "test-verify-token"
const APP_SECRET = "test-app-secret"

function makeWebhookPayload() {
  return {
    object: "whatsapp_business_account",
    entry: [{
      id: "123",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "5511999999999", phone_number_id: "123456" },
          contacts: [{ profile: { name: "John" }, wa_id: "5511888888888" }],
          messages: [{ from: "5511888888888", id: "wamid.123", timestamp: "1234567890", type: "text", text: { body: "Hello" } }],
        },
        field: "messages",
      }],
    }],
  }
}

function makeSignature(body: string): string {
  return "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex")
}

function mockRes() {
  return {
    send: vi.fn(),
    sendStatus: vi.fn(),
  }
}

describe("expressMiddleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("should handle GET verification", async () => {
    const handler = expressMiddleware({ verifyToken: VERIFY_TOKEN })
    const req = {
      method: "GET",
      query: { "hub.mode": "subscribe", "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "challenge_123" },
    }
    const res = mockRes()

    await handler(req, res)

    expect(res.send).toHaveBeenCalledWith("challenge_123")
  })

  it("should return 403 for invalid verify token", async () => {
    const handler = expressMiddleware({ verifyToken: VERIFY_TOKEN })
    const req = {
      method: "GET",
      query: { "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "challenge_123" },
    }
    const res = mockRes()

    await handler(req, res)

    expect(res.sendStatus).toHaveBeenCalledWith(403)
  })

  it("should parse POST webhook events and call onMessage", async () => {
    const onMessage = vi.fn()
    const handler = expressMiddleware({ verifyToken: VERIFY_TOKEN, onMessage })
    const payload = makeWebhookPayload()
    const req = { method: "POST", body: payload, headers: {} }
    const res = mockRes()

    await handler(req, res)

    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0].type).toBe("message")
    expect(onMessage.mock.calls[0][0].message.text.body).toBe("Hello")
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })

  it("should verify HMAC when appSecret is provided", async () => {
    const onMessage = vi.fn()
    const handler = expressMiddleware({ verifyToken: VERIFY_TOKEN, appSecret: APP_SECRET, onMessage })
    const payload = makeWebhookPayload()
    const rawBody = Buffer.from(JSON.stringify(payload))
    const signature = makeSignature(rawBody.toString())
    const req = {
      method: "POST",
      body: payload,
      rawBody,
      headers: { "x-hub-signature-256": signature },
    }
    const res = mockRes()

    await handler(req, res)

    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })

  it("should return 401 for invalid HMAC signature", async () => {
    const onMessage = vi.fn()
    const handler = expressMiddleware({ verifyToken: VERIFY_TOKEN, appSecret: APP_SECRET, onMessage })
    const req = {
      method: "POST",
      body: makeWebhookPayload(),
      rawBody: Buffer.from("{}"),
      headers: { "x-hub-signature-256": "sha256=invalid" },
    }
    const res = mockRes()

    await handler(req, res)

    expect(onMessage).not.toHaveBeenCalled()
    expect(res.sendStatus).toHaveBeenCalledWith(401)
  })

  it("should return 401 when rawBody is missing for HMAC", async () => {
    const handler = expressMiddleware({ verifyToken: VERIFY_TOKEN, appSecret: APP_SECRET })
    const req = {
      method: "POST",
      body: makeWebhookPayload(),
      headers: { "x-hub-signature-256": "sha256=something" },
    }
    const res = mockRes()

    await handler(req, res)

    expect(res.sendStatus).toHaveBeenCalledWith(401)
  })
})
