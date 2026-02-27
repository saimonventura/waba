import { describe, it, expect, vi, beforeEach } from "vitest"
import { WhatsApp } from "../src/client.js"
import { WhatsAppError } from "../src/errors.js"

const PHONE_ID = "123456789"
const TOKEN = "test-token"
const API_VERSION = "v25.0"
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`

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

const SUCCESS = {
  messaging_product: "whatsapp",
  contacts: [{ input: "5511999999999", wa_id: "5511999999999" }],
  messages: [{ id: "wamid.test" }],
}

function parseFetchBody(mock: ReturnType<typeof vi.fn>): any {
  const call = mock.mock.calls[0]
  return JSON.parse(call[1].body)
}

function parseFetchHeaders(mock: ReturnType<typeof vi.fn>): Record<string, string> {
  return mock.mock.calls[0][1].headers
}

function parseFetchUrl(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][0]
}

describe("WhatsApp Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ── Constructor ──

  it("should use default API version v25.0", () => {
    const client = createClient()
    // wabaId should be undefined when not provided
    expect(client.wabaId).toBeUndefined()
  })

  it("should accept custom API version and wabaId", () => {
    const client = new WhatsApp({
      phoneNumberId: PHONE_ID,
      accessToken: TOKEN,
      apiVersion: "v21.0",
      wabaId: "waba-123",
    })
    expect(client.wabaId).toBe("waba-123")
  })

  // ── sendText ──

  it("should send text message with correct payload", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    const result = await client.sendText("5511999999999", "Hello!")

    expect(parseFetchUrl(mock)).toBe(BASE_URL)
    expect(parseFetchHeaders(mock)["Authorization"]).toBe(`Bearer ${TOKEN}`)
    expect(parseFetchHeaders(mock)["Content-Type"]).toBe("application/json")
    expect(parseFetchBody(mock)).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "5511999999999",
      type: "text",
      text: { preview_url: false, body: "Hello!" },
    })
    expect(result).toEqual(SUCCESS)
  })

  it("should send text with previewUrl enabled", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendText("5511999999999", "Check https://example.com", { previewUrl: true })

    expect(parseFetchBody(mock).text.preview_url).toBe(true)
  })

  it("should send text with replyTo context", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendText("5511999999999", "Reply!", { replyTo: "wamid.original" })

    const body = parseFetchBody(mock)
    expect(body.context).toEqual({ message_id: "wamid.original" })
  })

  // ── sendImage ──

  it("should send image with URL", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendImage("5511999999999", { url: "https://example.com/img.jpg" }, "Nice photo")

    const body = parseFetchBody(mock)
    expect(body.type).toBe("image")
    expect(body.image).toEqual({ link: "https://example.com/img.jpg", caption: "Nice photo" })
  })

  it("should send image with media ID", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendImage("5511999999999", { id: "media-id-123" })

    const body = parseFetchBody(mock)
    expect(body.image).toEqual({ id: "media-id-123" })
  })

  // ── sendAudio ──

  it("should send audio with URL", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendAudio("5511999999999", { url: "https://example.com/audio.ogg" })

    const body = parseFetchBody(mock)
    expect(body.type).toBe("audio")
    expect(body.audio).toEqual({ link: "https://example.com/audio.ogg" })
  })

  // ── sendVideo ──

  it("should send video with caption", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendVideo("5511999999999", { url: "https://example.com/vid.mp4" }, "Watch this")

    const body = parseFetchBody(mock)
    expect(body.type).toBe("video")
    expect(body.video).toEqual({ link: "https://example.com/vid.mp4", caption: "Watch this" })
  })

  it("should send video without caption", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendVideo("5511999999999", { id: "video-id" })

    const body = parseFetchBody(mock)
    expect(body.video).toEqual({ id: "video-id" })
  })

  // ── sendDocument ──

  it("should send document with filename and caption", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendDocument("5511999999999", { url: "https://example.com/doc.pdf" }, "invoice.pdf", "Your invoice")

    const body = parseFetchBody(mock)
    expect(body.type).toBe("document")
    expect(body.document).toEqual({
      link: "https://example.com/doc.pdf",
      filename: "invoice.pdf",
      caption: "Your invoice",
    })
  })

  // ── sendSticker ──

  it("should send sticker with media ID", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendSticker("5511999999999", { id: "sticker-id" })

    const body = parseFetchBody(mock)
    expect(body.type).toBe("sticker")
    expect(body.sticker).toEqual({ id: "sticker-id" })
  })

  // ── sendLocation ──

  it("should send location with all fields", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendLocation("5511999999999", {
      lat: -23.5505,
      lng: -46.6333,
      name: "Sao Paulo",
      address: "Av Paulista, 1000",
    })

    const body = parseFetchBody(mock)
    expect(body.type).toBe("location")
    expect(body.location).toEqual({
      latitude: -23.5505,
      longitude: -46.6333,
      name: "Sao Paulo",
      address: "Av Paulista, 1000",
    })
  })

  // ── sendContacts ──

  it("should send contacts", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    const contacts = [{
      name: { formatted_name: "John Doe", first_name: "John" },
      phones: [{ phone: "+5514999999999", type: "CELL" }],
    }]

    await client.sendContacts("5511999999999", contacts)

    const body = parseFetchBody(mock)
    expect(body.type).toBe("contacts")
    expect(body.contacts).toEqual(contacts)
  })

  // ── sendReaction ──

  it("should send reaction emoji", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendReaction("5511999999999", "wamid.target", "\u{1F44D}")

    const body = parseFetchBody(mock)
    expect(body.type).toBe("reaction")
    expect(body.reaction).toEqual({ message_id: "wamid.target", emoji: "\u{1F44D}" })
  })

  // ── removeReaction ──

  it("should remove reaction with empty emoji", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.removeReaction("5511999999999", "wamid.target")

    const body = parseFetchBody(mock)
    expect(body.reaction).toEqual({ message_id: "wamid.target", emoji: "" })
  })

  // ── markAsRead ──

  it("should mark message as read", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.markAsRead("wamid.read-me")

    const body = parseFetchBody(mock)
    expect(body).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.read-me",
    })
  })

  // ── Error Handling ──

  it("should throw WhatsAppError on 400 response", async () => {
    mockFetch({
      error: {
        message: "(#131030) Recipient not in allowed list",
        type: "OAuthException",
        code: 131030,
        error_subcode: 2494010,
        fbtrace_id: "trace123",
      },
    }, 400)
    const client = createClient()

    await expect(client.sendText("bad-number", "Hi")).rejects.toThrow(WhatsAppError)

    try {
      await client.sendText("bad-number", "Hi")
    } catch (err) {
      expect(err).toBeInstanceOf(WhatsAppError)
      const waErr = err as WhatsAppError
      expect(waErr.code).toBe(131030)
      expect(waErr.httpStatus).toBe(400)
    }
  })

  it("should throw WhatsAppError on 500 with empty body", async () => {
    mockFetch({}, 500)
    const client = createClient()

    await expect(client.sendText("5511999999999", "Hi")).rejects.toThrow(WhatsAppError)
  })

  // ── sendButtons ──

  it("should send buttons with header and footer", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendButtons(
      "5511999999999",
      "Choose an option:",
      [
        { id: "btn_yes", title: "Yes" },
        { id: "btn_no", title: "No" },
      ],
      { header: "Confirm", footer: "Tap a button" },
    )

    const body = parseFetchBody(mock)
    expect(body.type).toBe("interactive")
    expect(body.interactive).toEqual({
      type: "button",
      header: { type: "text", text: "Confirm" },
      body: { text: "Choose an option:" },
      footer: { text: "Tap a button" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "btn_yes", title: "Yes" } },
          { type: "reply", reply: { id: "btn_no", title: "No" } },
        ],
      },
    })
  })

  it("should send buttons without header/footer", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendButtons("5511999999999", "Pick one", [
      { id: "opt1", title: "Option 1" },
    ])

    const body = parseFetchBody(mock)
    expect(body.interactive.header).toBeUndefined()
    expect(body.interactive.footer).toBeUndefined()
    expect(body.interactive.body.text).toBe("Pick one")
  })

  // ── sendList ──

  it("should send list message", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    const sections = [
      {
        title: "Category A",
        rows: [
          { id: "row1", title: "Item 1", description: "First item" },
          { id: "row2", title: "Item 2" },
        ],
      },
    ]

    await client.sendList(
      "5511999999999",
      "Browse our catalog",
      "View Items",
      sections,
      { header: "Catalog", footer: "Scroll to see more" },
    )

    const body = parseFetchBody(mock)
    expect(body.type).toBe("interactive")
    expect(body.interactive).toEqual({
      type: "list",
      header: { type: "text", text: "Catalog" },
      body: { text: "Browse our catalog" },
      footer: { text: "Scroll to see more" },
      action: {
        button: "View Items",
        sections,
      },
    })
  })

  // ── sendCTA ──

  it("should send CTA URL button", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendCTA(
      "5511999999999",
      "Visit our website",
      { text: "Open Site", url: "https://example.com" },
      { footer: "Powered by us" },
    )

    const body = parseFetchBody(mock)
    expect(body.type).toBe("interactive")
    expect(body.interactive).toEqual({
      type: "cta_url",
      body: { text: "Visit our website" },
      footer: { text: "Powered by us" },
      action: {
        name: "cta_url",
        parameters: {
          display_text: "Open Site",
          url: "https://example.com",
        },
      },
    })
  })

  // ── sendProduct ──

  it("should send product message with body text", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendProduct("5511999999999", "catalog-001", "product-abc", "Check this out!")

    const body = parseFetchBody(mock)
    expect(body.type).toBe("interactive")
    expect(body.interactive).toEqual({
      type: "product",
      body: { text: "Check this out!" },
      action: {
        catalog_id: "catalog-001",
        product_retailer_id: "product-abc",
      },
    })
  })

  it("should send product message without body text", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendProduct("5511999999999", "catalog-001", "product-abc")

    const body = parseFetchBody(mock)
    expect(body.interactive.body).toBeUndefined()
    expect(body.interactive.action).toEqual({
      catalog_id: "catalog-001",
      product_retailer_id: "product-abc",
    })
  })

  // ── Custom API Version ──

  it("should use custom API version in URL", async () => {
    const mock = mockFetch(SUCCESS)
    const client = new WhatsApp({
      phoneNumberId: PHONE_ID,
      accessToken: TOKEN,
      apiVersion: "v21.0",
    })

    await client.sendText("5511999999999", "Hello")

    expect(parseFetchUrl(mock)).toBe(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`)
  })
})
