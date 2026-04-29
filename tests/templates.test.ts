import { describe, it, expect, vi, beforeEach } from "vitest"
import { WhatsApp } from "../src/client.js"
import { ValidationError } from "../src/validate.js"

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

function createValidatingClient() {
  return new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID, validate: true })
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

  // ── createCarouselTemplate ──

  const CREATE_OK = { id: "tpl_999", status: "PENDING", category: "MARKETING" }

  it("should create carousel template with 3 image cards (happy path)", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    const result = await client.createCarouselTemplate({
      name: "promo_v1",
      language: "pt_BR",
      body: { text: "Confira nossas ofertas! 🛒" },
      cards: [
        {
          header: { format: "image", handle: "h1" },
          body: { text: "Card 1\n*R$ 6,90*" },
          buttons: [{ type: "url", text: "Comprar", url: "https://shop.example.com" }],
        },
        {
          header: { format: "image", handle: "h2" },
          body: { text: "Card 2\n*R$ 37,90*" },
          buttons: [{ type: "url", text: "Comprar", url: "https://shop.example.com" }],
        },
        {
          header: { format: "image", handle: "h3" },
          body: { text: "Card 3\n*R$ 529,90*" },
          buttons: [{ type: "url", text: "Comprar", url: "https://shop.example.com" }],
        },
      ],
    })

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${WABA_ID}/message_templates`)
    const body = parseFetchBody(mock)
    expect(body.name).toBe("promo_v1")
    expect(body.language).toBe("pt_BR")
    expect(body.category).toBe("MARKETING")

    expect(body.components).toHaveLength(2)
    expect(body.components[0]).toEqual({ type: "body", text: "Confira nossas ofertas! 🛒" })

    const carousel = body.components[1]
    expect(carousel.type).toBe("carousel")
    expect(carousel.cards).toHaveLength(3)

    const card0 = carousel.cards[0]
    expect(card0.components[0]).toEqual({
      type: "header",
      format: "image",
      example: { header_handle: ["h1"] },
    })
    expect(card0.components[1]).toEqual({ type: "body", text: "Card 1\n*R$ 6,90*" })
    expect(card0.components[2]).toEqual({
      type: "buttons",
      buttons: [{ type: "url", text: "Comprar", url: "https://shop.example.com" }],
    })

    expect(result).toEqual(CREATE_OK)
  })

  it("should include example.body_text when carousel body has variables", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    await client.createCarouselTemplate({
      name: "with_var",
      language: "pt_BR",
      body: { text: "Olá {{1}}, confira:", example: ["Pablo"] },
      cards: [
        { header: { format: "image", handle: "h1" } },
        { header: { format: "image", handle: "h2" } },
      ],
    })

    const body = parseFetchBody(mock)
    expect(body.components[0]).toEqual({
      type: "body",
      text: "Olá {{1}}, confira:",
      example: { body_text: [["Pablo"]] },
    })
  })

  it("should attach url button example when card url has variable", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    await client.createCarouselTemplate({
      name: "url_var",
      language: "pt_BR",
      body: { text: "Veja:" },
      cards: [
        {
          header: { format: "image", handle: "h1" },
          buttons: [{ type: "url", text: "Ver", url: "https://shop.example.com/{{1}}", example: "blue-elf" }],
        },
        {
          header: { format: "image", handle: "h2" },
          buttons: [{ type: "url", text: "Ver", url: "https://shop.example.com/{{1}}", example: "buddha" }],
        },
      ],
    })

    const body = parseFetchBody(mock)
    const card0Button = body.components[1].cards[0].components[1].buttons[0]
    expect(card0Button.example).toEqual(["blue-elf"])
  })

  it("should support video header format on carousel cards", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    await client.createCarouselTemplate({
      name: "video_carousel",
      language: "pt_BR",
      body: { text: "Vídeos:" },
      cards: [
        { header: { format: "video", handle: "v1" } },
        { header: { format: "video", handle: "v2" } },
      ],
    })

    const body = parseFetchBody(mock)
    const card0Header = body.components[1].cards[0].components[0]
    expect(card0Header).toEqual({
      type: "header",
      format: "video",
      example: { header_handle: ["v1"] },
    })
  })

  it("should reject carousel with fewer than 2 cards", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createCarouselTemplate({
      name: "too_few",
      language: "pt_BR",
      body: { text: "x" },
      cards: [{ header: { format: "image", handle: "h1" } }],
    })).rejects.toThrow(/at least 2 cards/i)
  })

  it("should reject carousel with more than 10 cards", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    const cards = Array.from({ length: 11 }, (_, i) => ({ header: { format: "image" as const, handle: `h${i}` } }))

    await expect(client.createCarouselTemplate({
      name: "too_many",
      language: "pt_BR",
      body: { text: "x" },
      cards,
    })).rejects.toThrow(/at most 10 cards/i)
  })

  it("should reject carousel where one card has body and another doesn't", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createCarouselTemplate({
      name: "mixed_body",
      language: "pt_BR",
      body: { text: "x" },
      cards: [
        { header: { format: "image", handle: "h1" }, body: { text: "has body" } },
        { header: { format: "image", handle: "h2" } },
      ],
    })).rejects.toThrow(/same components/i)
  })

  it("should reject carousel where cards have different button counts", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createCarouselTemplate({
      name: "mixed_btns",
      language: "pt_BR",
      body: { text: "x" },
      cards: [
        {
          header: { format: "image", handle: "h1" },
          buttons: [{ type: "url", text: "A", url: "https://x.com" }, { type: "quick_reply", text: "B" }],
        },
        {
          header: { format: "image", handle: "h2" },
          buttons: [{ type: "url", text: "A", url: "https://x.com" }],
        },
      ],
    })).rejects.toThrow(/same components/i)
  })

  it("should reject carousel where button types differ in order", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createCarouselTemplate({
      name: "mixed_btn_types",
      language: "pt_BR",
      body: { text: "x" },
      cards: [
        {
          header: { format: "image", handle: "h1" },
          buttons: [{ type: "quick_reply", text: "A" }, { type: "url", text: "B", url: "https://x.com" }],
        },
        {
          header: { format: "image", handle: "h2" },
          buttons: [{ type: "url", text: "A", url: "https://x.com" }, { type: "quick_reply", text: "B" }],
        },
      ],
    })).rejects.toThrow(/same components/i)
  })

  it("should throw on createCarouselTemplate without wabaId", async () => {
    const client = createClientNoWaba()

    await expect(client.createCarouselTemplate({
      name: "x",
      language: "pt_BR",
      body: { text: "x" },
      cards: [
        { header: { format: "image", handle: "h1" } },
        { header: { format: "image", handle: "h2" } },
      ],
    })).rejects.toThrow(/wabaId is required/)
  })

  // ── createStandardTemplate ──

  it("should create standard template with body only", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    await client.createStandardTemplate({
      name: "simple",
      language: "pt_BR",
      category: "UTILITY",
      body: { text: "Seu pedido foi confirmado." },
    })

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${WABA_ID}/message_templates`)
    const body = parseFetchBody(mock)
    expect(body).toEqual({
      name: "simple",
      language: "pt_BR",
      category: "UTILITY",
      components: [{ type: "body", text: "Seu pedido foi confirmado." }],
    })
  })

  it("should create standard template with text header + variable example", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    await client.createStandardTemplate({
      name: "with_header",
      language: "pt_BR",
      category: "MARKETING",
      header: { type: "text", text: "Olá {{1}}!", example: "Pablo" },
      body: { text: "Aproveite {{1}} de desconto", example: ["20%"] },
    })

    const body = parseFetchBody(mock)
    expect(body.components[0]).toEqual({
      type: "header",
      format: "text",
      text: "Olá {{1}}!",
      example: { header_text: ["Pablo"] },
    })
    expect(body.components[1]).toEqual({
      type: "body",
      text: "Aproveite {{1}} de desconto",
      example: { body_text: [["20%"]] },
    })
  })

  it("should create standard template with image header (handle)", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    await client.createStandardTemplate({
      name: "with_img",
      language: "pt_BR",
      category: "MARKETING",
      header: { type: "image", handle: "h1" },
      body: { text: "Confira" },
    })

    const body = parseFetchBody(mock)
    expect(body.components[0]).toEqual({
      type: "header",
      format: "image",
      example: { header_handle: ["h1"] },
    })
  })

  it("should create standard template with footer and mixed buttons", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    await client.createStandardTemplate({
      name: "with_btns",
      language: "pt_BR",
      category: "MARKETING",
      body: { text: "Confira nossa loja" },
      footer: "Triptem © 2026",
      buttons: [
        { type: "url", text: "Loja", url: "https://shop.example.com/{{1}}", example: "promo" },
        { type: "phone_number", text: "Ligar", phone_number: "+5511999999999" },
        { type: "quick_reply", text: "Mais info" },
      ],
    })

    const body = parseFetchBody(mock)
    expect(body.components[0]).toEqual({ type: "body", text: "Confira nossa loja" })
    expect(body.components[1]).toEqual({ type: "footer", text: "Triptem © 2026" })

    const btns = body.components[2]
    expect(btns.type).toBe("buttons")
    expect(btns.buttons).toEqual([
      { type: "url", text: "Loja", url: "https://shop.example.com/{{1}}", example: ["promo"] },
      { type: "phone_number", text: "Ligar", phone_number: "+5511999999999" },
      { type: "quick_reply", text: "Mais info" },
    ])
  })

  it("should create marketing coupon template with copy_code button", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    await client.createStandardTemplate({
      name: "coupon_promo",
      language: "pt_BR",
      category: "MARKETING",
      body: { text: "Use o código {{1}} pra 20% off", example: ["SAVE20"] },
      buttons: [{ type: "copy_code", example: "SAVE20" }],
    })

    const body = parseFetchBody(mock)
    const btns = body.components[1]
    expect(btns.buttons[0]).toEqual({ type: "copy_code", example: "SAVE20" })
  })

  it("should reject standard template with empty body", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createStandardTemplate({
      name: "empty",
      language: "pt_BR",
      category: "UTILITY",
      body: { text: "" },
    })).rejects.toThrow(/body.*empty|body.*required/i)
  })

  it("should reject standard template with body over 1024 chars (validate: true)", async () => {
    mockFetch(CREATE_OK)
    const client = createValidatingClient()

    await expect(client.createStandardTemplate({
      name: "huge",
      language: "pt_BR",
      category: "UTILITY",
      body: { text: "x".repeat(1025) },
    })).rejects.toThrow(/1024/)
  })

  it("should accept standard template with body exactly 1024 chars (boundary)", async () => {
    mockFetch(CREATE_OK)
    const client = createValidatingClient()

    await expect(client.createStandardTemplate({
      name: "edge",
      language: "pt_BR",
      category: "UTILITY",
      body: { text: "x".repeat(1024) },
    })).resolves.toBeDefined()
  })

  it("should reject standard template with text header over 60 chars (validate: true)", async () => {
    mockFetch(CREATE_OK)
    const client = createValidatingClient()

    await expect(client.createStandardTemplate({
      name: "big_header",
      language: "pt_BR",
      category: "MARKETING",
      header: { type: "text", text: "x".repeat(61) },
      body: { text: "ok" },
    })).rejects.toThrow(/header.*60|60.*header/i)
  })

  it("should reject standard template with footer over 60 chars (validate: true)", async () => {
    mockFetch(CREATE_OK)
    const client = createValidatingClient()

    await expect(client.createStandardTemplate({
      name: "big_footer",
      language: "pt_BR",
      category: "MARKETING",
      body: { text: "ok" },
      footer: "x".repeat(61),
    })).rejects.toThrow(/footer.*60|60.*footer/i)
  })

  it("should skip char-limit checks when validate flag is off", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createStandardTemplate({
      name: "no_validation",
      language: "pt_BR",
      category: "UTILITY",
      body: { text: "x".repeat(2000) },
      footer: "x".repeat(200),
    })).resolves.toBeDefined()
  })

  it("should throw on createStandardTemplate without wabaId", async () => {
    const client = createClientNoWaba()

    await expect(client.createStandardTemplate({
      name: "x",
      language: "pt_BR",
      category: "UTILITY",
      body: { text: "x" },
    })).rejects.toThrow(/wabaId is required/)
  })

  // ── ValidationError instance + carousel extra coverage ──

  it("should throw ValidationError instance (not raw Error) on validation failure", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createStandardTemplate({
      name: "x",
      language: "pt_BR",
      category: "UTILITY",
      body: { text: "" },
    })).rejects.toBeInstanceOf(ValidationError)
  })

  it("should reject carousel where header formats differ across cards", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createCarouselTemplate({
      name: "format_mix",
      language: "pt_BR",
      body: { text: "ok" },
      cards: [
        { header: { format: "image", handle: "h1" } },
        { header: { format: "video", handle: "v2" } },
      ],
    })).rejects.toThrow(/same components/i)
  })

  it("should reject carousel with empty body", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createCarouselTemplate({
      name: "no_body",
      language: "pt_BR",
      body: { text: "" },
      cards: [
        { header: { format: "image", handle: "h1" } },
        { header: { format: "image", handle: "h2" } },
      ],
    })).rejects.toThrow(/body.*empty|body.*required/i)
  })

  it("should reject carousel with body over 1024 chars (validate: true)", async () => {
    mockFetch(CREATE_OK)
    const client = createValidatingClient()

    await expect(client.createCarouselTemplate({
      name: "huge_body",
      language: "pt_BR",
      body: { text: "x".repeat(1025) },
      cards: [
        { header: { format: "image", handle: "h1" } },
        { header: { format: "image", handle: "h2" } },
      ],
    })).rejects.toThrow(/1024/)
  })

  it("should reject carousel with card body over 160 chars (validate: true)", async () => {
    mockFetch(CREATE_OK)
    const client = createValidatingClient()

    await expect(client.createCarouselTemplate({
      name: "big_card",
      language: "pt_BR",
      body: { text: "ok" },
      cards: [
        { header: { format: "image", handle: "h1" }, body: { text: "x".repeat(161) } },
        { header: { format: "image", handle: "h2" }, body: { text: "ok" } },
      ],
    })).rejects.toThrow(/160/)
  })

  it("should accept carousel with exactly 2 cards (lower boundary)", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    await expect(client.createCarouselTemplate({
      name: "min_cards",
      language: "pt_BR",
      body: { text: "ok" },
      cards: [
        { header: { format: "image", handle: "h1" } },
        { header: { format: "image", handle: "h2" } },
      ],
    })).resolves.toBeDefined()
  })

  it("should accept carousel with exactly 10 cards (upper boundary)", async () => {
    mockFetch(CREATE_OK)
    const client = createClient()

    const cards = Array.from({ length: 10 }, (_, i) => ({
      header: { format: "image" as const, handle: `h${i}` },
    }))

    await expect(client.createCarouselTemplate({
      name: "max_cards",
      language: "pt_BR",
      body: { text: "ok" },
      cards,
    })).resolves.toBeDefined()
  })

  it("should build carousel card with quick_reply button output", async () => {
    const mock = mockFetch(CREATE_OK)
    const client = createClient()

    await client.createCarouselTemplate({
      name: "qr_carousel",
      language: "pt_BR",
      body: { text: "ok" },
      cards: [
        { header: { format: "image", handle: "h1" }, buttons: [{ type: "quick_reply", text: "More" }] },
        { header: { format: "image", handle: "h2" }, buttons: [{ type: "quick_reply", text: "More" }] },
      ],
    })

    const body = parseFetchBody(mock)
    const card0Buttons = body.components[1].cards[0].components[1]
    expect(card0Buttons).toEqual({ type: "buttons", buttons: [{ type: "quick_reply", text: "More" }] })
  })
})
