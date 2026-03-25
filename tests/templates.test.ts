import { describe, it, expect, vi, beforeEach } from "vitest"
import { WhatsApp } from "../src/client.js"

const PHONE_ID = "123456789"
const TOKEN = "test-token"
const WABA_ID = "WABA_123"
const API_VERSION = "v25.0"
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

function createClient() {
  return new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID })
}

function createClientNoWaba() {
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

function parseFetchUrl(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][0]
}

describe("Templates", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ── sendTemplate ──

  it("should send template with name and language only", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    const result = await client.sendTemplate("5511999999999", "hello_world", "en_US")

    const body = parseFetchBody(mock)
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/messages`)
    expect(body.type).toBe("template")
    expect(body.template).toEqual({
      name: "hello_world",
      language: { code: "en_US" },
    })
    expect(body.messaging_product).toBe("whatsapp")
    expect(result).toEqual(SUCCESS)
  })

  it("should send template with components", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    const components = [
      {
        type: "body" as const,
        parameters: [{ type: "text" as const, text: "John" }],
      },
    ]

    await client.sendTemplate("5511999999999", "order_update", "pt_BR", components)

    const body = parseFetchBody(mock)
    expect(body.template).toEqual({
      name: "order_update",
      language: { code: "pt_BR" },
      components,
    })
  })

  // ── listTemplates ──

  it("should list templates via GET to WABA_ID/message_templates", async () => {
    const templatesResponse = { data: [{ name: "hello_world", status: "APPROVED" }] }
    const mock = mockFetch(templatesResponse)
    const client = createClient()

    const result = await client.listTemplates()

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${WABA_ID}/message_templates`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(templatesResponse)
  })

  it("should list templates with status and category filters", async () => {
    const mock = mockFetch({ data: [] })
    const client = createClient()

    await client.listTemplates({ status: "APPROVED", category: "MARKETING" })

    const url = parseFetchUrl(mock)
    expect(url).toContain(`${WABA_ID}/message_templates?`)
    expect(url).toContain("status=APPROVED")
    expect(url).toContain("category=MARKETING")
  })

  // ── createTemplate ──

  it("should create template with POST body", async () => {
    const createResponse = { id: "template-123", status: "PENDING" }
    const mock = mockFetch(createResponse)
    const client = createClient()

    const templateData = {
      name: "promo_sale",
      category: "MARKETING" as const,
      language: "pt_BR",
      components: [{ type: "BODY", text: "Sale is on!" }],
    }

    const result = await client.createTemplate(templateData)

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${WABA_ID}/message_templates`)
    expect(parseFetchBody(mock)).toEqual(templateData)
    expect(result).toEqual(createResponse)
  })

  // ── deleteTemplate ──

  it("should delete template with name query param", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.deleteTemplate("hello_world")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${WABA_ID}/message_templates?name=hello_world`)
    expect(mock.mock.calls[0][1].method).toBe("DELETE")
  })

  // ── Error: no wabaId ──

  it("should throw error on listTemplates without wabaId", async () => {
    const client = createClientNoWaba()

    await expect(client.listTemplates()).rejects.toThrow("wabaId is required for template management")
  })

  it("should throw error on createTemplate without wabaId", async () => {
    const client = createClientNoWaba()

    await expect(
      client.createTemplate({
        name: "test",
        category: "UTILITY",
        language: "en_US",
        components: [],
      }),
    ).rejects.toThrow("wabaId is required for template management")
  })

  // ── getTemplate ──

  it("should get template by ID", async () => {
    const templateResponse = { id: "tpl_123", name: "hello_world", status: "APPROVED" }
    const mock = mockFetch(templateResponse)
    const client = createClient()

    const result = await client.getTemplate("tpl_123")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/tpl_123`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(templateResponse)
  })

  // ── updateTemplate ──

  it("should update template by ID", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.updateTemplate("tpl_123", { components: [{ type: "BODY", text: "Updated" }], category: "UTILITY" })

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/tpl_123`)
    expect(parseFetchBody(mock)).toEqual({ components: [{ type: "BODY", text: "Updated" }], category: "UTILITY" })
  })

  // ── sendCarouselTemplate ──

  it("should send carousel template with 2 cards", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendCarouselTemplate("5511999999999", "promo_cards", "pt_BR",
      [{ type: "text", text: "Welcome!" }],
      [
        {
          header: { id: "img_1" },
          bodyParams: [{ type: "text", text: "Card 1" }],
          buttons: [{ sub_type: "quick_reply", index: 0, parameters: [{ type: "payload", payload: "card1_btn" }] }],
        },
        {
          header: { url: "https://example.com/img2.jpg" },
          bodyParams: [{ type: "text", text: "Card 2" }],
        },
      ],
    )

    const body = parseFetchBody(mock)
    expect(body.type).toBe("template")
    expect(body.template.name).toBe("promo_cards")
    expect(body.template.components).toHaveLength(2)

    // Body component
    expect(body.template.components[0].type).toBe("body")
    expect(body.template.components[0].parameters[0].text).toBe("Welcome!")

    // Carousel component
    const carousel = body.template.components[1]
    expect(carousel.type).toBe("carousel")
    expect(carousel.cards).toHaveLength(2)

    // Card 0
    expect(carousel.cards[0].card_index).toBe(0)
    expect(carousel.cards[0].components[0].type).toBe("header")
    expect(carousel.cards[0].components[0].parameters[0]).toEqual({ type: "image", image: { id: "img_1" } })
    expect(carousel.cards[0].components[1].type).toBe("body")
    expect(carousel.cards[0].components[2].type).toBe("button")
    expect(carousel.cards[0].components[2].sub_type).toBe("quick_reply")

    // Card 1 — URL header, no buttons
    expect(carousel.cards[1].card_index).toBe(1)
    expect(carousel.cards[1].components[0].parameters[0]).toEqual({ type: "image", image: { url: "https://example.com/img2.jpg" } })
  })

  it("should send carousel with video header type", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendCarouselTemplate("5511999999999", "video_cards", "en",
      [{ type: "text", text: "Videos" }],
      [{ header: { id: "vid_1" }, headerType: "video" }],
    )

    const body = parseFetchBody(mock)
    const card = body.template.components[1].cards[0]
    expect(card.components[0].parameters[0]).toEqual({ type: "video", video: { id: "vid_1" } })
  })

  // ── sendAuthTemplate ──

  it("should send auth template with default url button", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendAuthTemplate("5511999999999", "auth_otp", "en", "123456")

    const body = parseFetchBody(mock)
    expect(body.template.name).toBe("auth_otp")
    expect(body.template.components).toHaveLength(2)
    expect(body.template.components[0]).toEqual({ type: "body", parameters: [{ type: "text", text: "123456" }] })
    expect(body.template.components[1]).toEqual({ type: "button", sub_type: "url", index: 0, parameters: [{ type: "text", text: "123456" }] })
  })

  it("should send auth template with copy_code button", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendAuthTemplate("5511999999999", "auth_otp", "en", "654321", "copy_code")

    const body = parseFetchBody(mock)
    expect(body.template.components[1].sub_type).toBe("copy_code")
    expect(body.template.components[1].parameters[0].text).toBe("654321")
  })

  // ── sendCouponTemplate ──

  it("should send coupon template with LTO expiration", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendCouponTemplate("5511999999999", "promo_coupon", "pt_BR", "SAVE20",
      [{ type: "text", text: "20% OFF" }],
      1735689600,
    )

    const body = parseFetchBody(mock)
    expect(body.template.components).toHaveLength(3)
    expect(body.template.components[0]).toEqual({
      type: "limited_time_offer",
      parameters: [{ type: "date_time", date_time: { unix_time: 1735689600 } }],
    })
    expect(body.template.components[1].type).toBe("body")
    expect(body.template.components[2]).toEqual({
      type: "button", sub_type: "copy_code", index: 0,
      parameters: [{ type: "coupon_code", coupon_code: "SAVE20" }],
    })
  })

  it("should send coupon template without LTO", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendCouponTemplate("5511999999999", "coupon_basic", "pt_BR", "FREESHIP",
      [{ type: "text", text: "Frete gratis" }],
    )

    const body = parseFetchBody(mock)
    expect(body.template.components).toHaveLength(2)
    expect(body.template.components[0].type).toBe("body")
    expect(body.template.components[1].type).toBe("button")
    expect(body.template.components[1].parameters[0].coupon_code).toBe("FREESHIP")
  })
})
