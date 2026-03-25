import { describe, it, expect, vi, beforeEach } from "vitest"
import { WhatsApp } from "../src/client.js"

const PHONE_ID = "123456789"
const TOKEN = "test-token"
const API_VERSION = "v25.0"
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

function createClient() {
  return new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN })
}

function mockFetch(responseBody: any, status = 200) {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
    headers: new Headers({ "content-type": "application/json" }),
  })
  globalThis.fetch = mock
  return mock
}

function parseFetchBody(mock: ReturnType<typeof vi.fn>): any {
  return JSON.parse(mock.mock.calls[0][1].body)
}

function parseFetchUrl(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][0]
}

describe("Calling API", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("should initiate a call with SDP offer", async () => {
    const mock = mockFetch({ id: "call_123" })
    const client = createClient()

    await client.initiateCall("5511999999999", "v=0\r\no=- 123 IN IP4 0.0.0.0\r\n")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/calls`)
    const body = parseFetchBody(mock)
    expect(body.messaging_product).toBe("whatsapp")
    expect(body.to).toBe("5511999999999")
    expect(body.type).toBe("voice")
    expect(body.voice.sdp).toContain("v=0")
  })

  it("should accept a call with SDP answer", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.acceptCall("call_123", "v=0\r\no=answer\r\n")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/call_123`)
    const body = parseFetchBody(mock)
    expect(body.action).toBe("accept")
    expect(body.sdp).toContain("answer")
  })

  it("should reject a call", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.rejectCall("call_456")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/call_456`)
    expect(parseFetchBody(mock)).toEqual({ action: "reject" })
  })

  it("should terminate a call", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.terminateCall("call_789")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/call_789`)
    expect(parseFetchBody(mock)).toEqual({ action: "terminate" })
  })
})
