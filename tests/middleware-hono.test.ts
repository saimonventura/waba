import { describe, it, expect, vi, beforeEach } from "vitest"
import { honoMiddleware } from "../src/middleware/hono.js"
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

function mockHonoContext(method: string, opts: { query?: any; body?: string; headers?: Record<string, string> } = {}) {
  return {
    req: {
      method,
      query: () => opts.query || {},
      text: () => Promise.resolve(opts.body || ""),
      header: (name: string) => opts.headers?.[name],
    },
    text: vi.fn(),
  }
}

describe("honoMiddleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("should handle GET verification", async () => {
    const handler = honoMiddleware({ verifyToken: VERIFY_TOKEN })
    const c = mockHonoContext("GET", {
      query: { "hub.mode": "subscribe", "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "challenge_456" },
    })

    await handler(c)

    expect(c.text).toHaveBeenCalledWith("challenge_456")
  })

  it("should return 403 for invalid verify token", async () => {
    const handler = honoMiddleware({ verifyToken: VERIFY_TOKEN })
    const c = mockHonoContext("GET", {
      query: { "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "challenge" },
    })

    await handler(c)

    expect(c.text).toHaveBeenCalledWith("Forbidden", 403)
  })

  it("should parse POST webhook and call onMessage", async () => {
    const onMessage = vi.fn()
    const handler = honoMiddleware({ verifyToken: VERIFY_TOKEN, onMessage })
    const body = JSON.stringify(makeWebhookPayload())
    const c = mockHonoContext("POST", { body })

    await handler(c)

    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0].type).toBe("message")
    expect(c.text).toHaveBeenCalledWith("OK", 200)
  })

  it("should verify HMAC when appSecret is provided", async () => {
    const onMessage = vi.fn()
    const handler = honoMiddleware({ verifyToken: VERIFY_TOKEN, appSecret: APP_SECRET, onMessage })
    const body = JSON.stringify(makeWebhookPayload())
    const signature = makeSignature(body)
    const c = mockHonoContext("POST", { body, headers: { "x-hub-signature-256": signature } })

    await handler(c)

    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(c.text).toHaveBeenCalledWith("OK", 200)
  })

  it("should return 401 for invalid HMAC", async () => {
    const onMessage = vi.fn()
    const handler = honoMiddleware({ verifyToken: VERIFY_TOKEN, appSecret: APP_SECRET, onMessage })
    const c = mockHonoContext("POST", {
      body: JSON.stringify(makeWebhookPayload()),
      headers: { "x-hub-signature-256": "sha256=invalid" },
    })

    await handler(c)

    expect(onMessage).not.toHaveBeenCalled()
    expect(c.text).toHaveBeenCalledWith("Unauthorized", 401)
  })

  it("should return 401 when signature header is missing", async () => {
    const handler = honoMiddleware({ verifyToken: VERIFY_TOKEN, appSecret: APP_SECRET })
    const c = mockHonoContext("POST", { body: JSON.stringify(makeWebhookPayload()), headers: {} })

    await handler(c)

    expect(c.text).toHaveBeenCalledWith("Unauthorized", 401)
  })
})
