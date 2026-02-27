import { describe, it, expect, vi, beforeEach } from "vitest"
import { WhatsApp } from "../src/client.js"

const PHONE_ID = "123456789"
const TOKEN = "test-token"

function createClient() {
  return new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN })
}

const SUCCESS = {
  messaging_product: "whatsapp",
  contacts: [{ input: "551", wa_id: "551" }],
  messages: [{ id: "wamid.test" }],
}

describe("Broadcast Templates", () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it("should broadcast template to multiple recipients", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(SUCCESS),
      headers: new Headers({ "content-type": "application/json" }),
    })
    globalThis.fetch = mock
    const client = createClient()

    const result = await client.broadcastTemplate(
      ["551", "552", "553"],
      "hello_world",
      "en_US",
    )

    expect(mock).toHaveBeenCalledTimes(3)
    expect(result.succeeded).toHaveLength(3)
    expect(result.failed).toHaveLength(0)
  })

  it("should collect failures separately", async () => {
    let callCount = 0
    const mock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 2) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: { message: "Bad", code: 100, error_subcode: 0 } }),
          headers: new Headers({ "content-type": "application/json" }),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SUCCESS),
        headers: new Headers({ "content-type": "application/json" }),
      })
    })
    globalThis.fetch = mock
    const client = createClient()

    const result = await client.broadcastTemplate(
      ["551", "552", "553"],
      "hello_world",
      "en_US",
    )

    expect(result.succeeded).toHaveLength(2)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].to).toBe("552")
  })

  it("should pass components to each recipient", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(SUCCESS),
      headers: new Headers({ "content-type": "application/json" }),
    })
    globalThis.fetch = mock
    const client = createClient()

    const components = [{ type: "body" as const, parameters: [{ type: "text" as const, text: "Hi" }] }]
    await client.broadcastTemplate(["551"], "greet", "pt_BR", components)

    const body = JSON.parse(mock.mock.calls[0][1].body)
    expect(body.template.components).toEqual(components)
  })
})
