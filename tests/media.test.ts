import { describe, it, expect, vi, beforeEach } from "vitest"
import { WhatsApp } from "../src/client.js"
import { WhatsAppError } from "../src/errors.js"

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

function parseFetchUrl(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][0]
}

describe("Media Management", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ── uploadMedia ──

  it("should upload media with FormData", async () => {
    const mock = mockFetch({ id: "media-id-456" })
    const client = createClient()

    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const result = await client.uploadMedia(data, "image/jpeg")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/media`)
    expect(mock.mock.calls[0][1].method).toBe("POST")
    // body should be FormData (not JSON-stringified)
    const body = mock.mock.calls[0][1].body
    expect(body).toBeInstanceOf(FormData)
    expect(result).toEqual({ id: "media-id-456" })
  })

  // ── getMediaUrl ──

  it("should get media URL with GET request", async () => {
    const mediaInfo = {
      url: "https://lookaside.fbsbx.com/whatsapp/media/123",
      mime_type: "image/jpeg",
      sha256: "abc123",
      file_size: 12345,
      id: "media-id-456",
      messaging_product: "whatsapp",
    }
    const mock = mockFetch(mediaInfo)
    const client = createClient()

    const result = await client.getMediaUrl("media-id-456")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/media-id-456`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(mediaInfo)
  })

  // ── downloadMedia ──

  it("should download media from direct URL with Authorization header", async () => {
    const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(binaryData.buffer),
    })
    globalThis.fetch = mock

    const client = createClient()
    const mediaUrl = "https://lookaside.fbsbx.com/whatsapp/media/123"

    const result = await client.downloadMedia(mediaUrl)

    // Should call the direct URL (not Graph API)
    expect(mock.mock.calls[0][0]).toBe(mediaUrl)
    expect(mock.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(4)
  })

  it("should throw WhatsAppError on download failure", async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })
    globalThis.fetch = mock

    const client = createClient()

    await expect(
      client.downloadMedia("https://lookaside.fbsbx.com/whatsapp/media/invalid"),
    ).rejects.toThrow(WhatsAppError)

    try {
      await client.downloadMedia("https://lookaside.fbsbx.com/whatsapp/media/invalid")
    } catch (err) {
      expect(err).toBeInstanceOf(WhatsAppError)
      const waErr = err as WhatsAppError
      expect(waErr.httpStatus).toBe(404)
      expect(waErr.message).toContain("Media download failed")
    }
  })

  // ── deleteMedia ──

  it("should delete media with DELETE request", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.deleteMedia("media-id-456")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/media-id-456`)
    expect(mock.mock.calls[0][1].method).toBe("DELETE")
  })
})
