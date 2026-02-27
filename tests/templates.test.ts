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
})
