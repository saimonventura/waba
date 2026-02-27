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

function parseFetchBody(mock: ReturnType<typeof vi.fn>): any {
  const call = mock.mock.calls[0]
  return JSON.parse(call[1].body)
}

function parseFetchUrl(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][0]
}

describe("Two-Step Verification", () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it("should set two-step verification PIN", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.setTwoStepPin("123456")
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}`)
    expect(parseFetchBody(mock)).toEqual({ pin: "123456" })
  })

  it("should remove two-step verification PIN", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.removeTwoStepPin()
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}`)
    expect(parseFetchBody(mock)).toEqual({ pin: "" })
  })
})

describe("Block / Unblock", () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it("should block users with phone number array", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.blockUser(["5511999887766", "5511888776655"])
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/block`)
    expect(parseFetchBody(mock)).toEqual({
      messaging_product: "whatsapp",
      block: ["5511999887766", "5511888776655"],
    })
  })

  it("should unblock users", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.unblockUser(["5511999887766"])
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/unblock`)
    expect(parseFetchBody(mock)).toEqual({
      messaging_product: "whatsapp",
      unblock: ["5511999887766"],
    })
  })
})

describe("Commerce Settings", () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it("should get commerce settings", async () => {
    const settings = { is_cart_enabled: true, is_catalog_visible: true, id: "123" }
    const mock = mockFetch({ data: [settings] })
    const client = createClient()
    const result = await client.getCommerceSettings()
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/whatsapp_commerce_settings`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(settings)
  })

  it("should update commerce settings", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.updateCommerceSettings({ is_cart_enabled: false })
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/whatsapp_commerce_settings`)
    expect(parseFetchBody(mock)).toEqual({ is_cart_enabled: false })
  })
})

describe("Health Status", () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it("should get health status via wabaId", async () => {
    const healthData = {
      health_status: {
        can_send_message: "AVAILABLE",
        entities: [{ entity_type: "PHONE_NUMBER", id: PHONE_ID, can_send_message: "AVAILABLE" }],
      },
    }
    const mock = mockFetch(healthData)
    const client = createClient()
    const result = await client.getHealthStatus()
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${WABA_ID}?fields=health_status`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(healthData)
  })

  it("should throw error on getHealthStatus without wabaId", async () => {
    const client = createClientNoWaba()
    await expect(client.getHealthStatus()).rejects.toThrow("wabaId is required")
  })
})

describe("List Phone Numbers", () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it("should list phone numbers via wabaId", async () => {
    const phoneList = {
      data: [
        { id: "111", display_phone_number: "+5511999999999", verified_name: "Test Business", quality_rating: "GREEN" },
        { id: "222", display_phone_number: "+5511999999999", verified_name: "Another Business", quality_rating: "GREEN" },
      ],
    }
    const mock = mockFetch(phoneList)
    const client = createClient()
    const result = await client.listPhoneNumbers()
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${WABA_ID}/phone_numbers`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(phoneList)
  })

  it("should throw error on listPhoneNumbers without wabaId", async () => {
    const client = createClientNoWaba()
    await expect(client.listPhoneNumbers()).rejects.toThrow("wabaId is required")
  })
})

describe("QR Code Management", () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it("should create QR code with default PNG format", async () => {
    const qrData = { code: "qr123", prefilled_message: "Hi", deep_link_url: "https://wa.me/msg/qr123", qr_image_url: "https://..." }
    const mock = mockFetch(qrData)
    const client = createClient()
    const result = await client.createQR("Hi")
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/message_qrdls`)
    expect(parseFetchBody(mock)).toEqual({ prefilled_message: "Hi", generate_qr_image: "png" })
    expect(result).toEqual(qrData)
  })

  it("should create QR code with SVG format", async () => {
    const mock = mockFetch({ code: "qr456", prefilled_message: "Hello", deep_link_url: "..." })
    const client = createClient()
    await client.createQR("Hello", "svg")
    expect(parseFetchBody(mock)).toEqual({ prefilled_message: "Hello", generate_qr_image: "svg" })
  })

  it("should list QR codes", async () => {
    const qrList = { data: [{ code: "qr1", prefilled_message: "A", deep_link_url: "..." }] }
    const mock = mockFetch(qrList)
    const client = createClient()
    const result = await client.listQRCodes()
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/message_qrdls`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(qrList)
  })

  it("should update QR code message", async () => {
    const updated = { code: "qr123", prefilled_message: "New msg", deep_link_url: "..." }
    const mock = mockFetch(updated)
    const client = createClient()
    const result = await client.updateQR("qr123", "New msg")
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/message_qrdls/qr123`)
    expect(parseFetchBody(mock)).toEqual({ prefilled_message: "New msg" })
    expect(result).toEqual(updated)
  })

  it("should delete QR code", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.deleteQR("qr123")
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/message_qrdls/qr123`)
    expect(mock.mock.calls[0][1].method).toBe("DELETE")
  })
})

describe("Flows Management", () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it("should create flow", async () => {
    const mock = mockFetch({ id: "flow-123" })
    const client = createClient()
    const result = await client.createFlow("My Flow", ["LEAD_GENERATION"])
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${WABA_ID}/flows`)
    expect(parseFetchBody(mock)).toEqual({ name: "My Flow", categories: ["LEAD_GENERATION"] })
    expect(result).toEqual({ id: "flow-123" })
  })

  it("should throw on createFlow without wabaId", async () => {
    const client = createClientNoWaba()
    await expect(client.createFlow("Test", [])).rejects.toThrow("wabaId is required")
  })

  it("should list flows", async () => {
    const flowList = { data: [{ id: "f1", name: "Flow 1", status: "DRAFT", categories: [] }] }
    const mock = mockFetch(flowList)
    const client = createClient()
    const result = await client.listFlows()
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${WABA_ID}/flows`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(flowList)
  })

  it("should get flow by ID", async () => {
    const flowData = { id: "f1", name: "Flow 1", status: "PUBLISHED", categories: ["LEAD_GENERATION"] }
    const mock = mockFetch(flowData)
    const client = createClient()
    const result = await client.getFlow("f1")
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/f1`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(flowData)
  })

  it("should update flow metadata", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.updateFlow("f1", { name: "Updated Name" })
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/f1`)
    expect(parseFetchBody(mock)).toEqual({ name: "Updated Name" })
  })

  it("should publish flow", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.publishFlow("f1")
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/f1/publish`)
    expect(parseFetchBody(mock)).toEqual({})
  })

  it("should deprecate flow", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.deprecateFlow("f1")
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/f1/deprecate`)
    expect(parseFetchBody(mock)).toEqual({})
  })

  it("should delete flow", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()
    await client.deleteFlow("f1")
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/f1`)
    expect(mock.mock.calls[0][1].method).toBe("DELETE")
  })

  it("should get flow assets", async () => {
    const assets = { data: [{ name: "flow.json", asset_type: "FLOW_JSON" }] }
    const mock = mockFetch(assets)
    const client = createClient()
    const result = await client.getFlowAssets("f1")
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/f1/assets`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(assets)
  })

  it("should update flow JSON", async () => {
    const mock = mockFetch({ success: true, validation_errors: [] })
    const client = createClient()
    const json = JSON.stringify({ version: "3.0", screens: [] })
    const result = await client.updateFlowJSON("f1", json)
    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/f1/assets`)
    expect(result).toEqual({ success: true, validation_errors: [] })
  })
})

describe("Analytics", () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it("should get analytics with granularity", async () => {
    const analyticsData = { data: [{ data_points: [] }] }
    const mock = mockFetch(analyticsData)
    const client = createClient()
    const result = await client.getAnalytics(1700000000, 1700100000, "DAY")
    const url = parseFetchUrl(mock)
    expect(url).toContain(`${WABA_ID}?`)
    expect(url).toContain("fields=analytics.start(1700000000).end(1700100000).granularity(DAY)")
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(analyticsData)
  })

  it("should get conversation analytics with default granularity", async () => {
    const mock = mockFetch({ data: [] })
    const client = createClient()
    await client.getConversationAnalytics(1700000000, 1700100000)
    const url = parseFetchUrl(mock)
    expect(url).toContain("fields=conversation_analytics.start(1700000000).end(1700100000).granularity(DAILY)")
  })

  it("should get template analytics with template IDs filter", async () => {
    const mock = mockFetch({ data: [] })
    const client = createClient()
    await client.getTemplateAnalytics(1700000000, 1700100000, ["tmpl1", "tmpl2"])
    const url = parseFetchUrl(mock)
    expect(url).toContain("fields=template_analytics.start(1700000000).end(1700100000).template_ids([tmpl1,tmpl2])")
  })

  it("should throw on analytics without wabaId", async () => {
    const client = createClientNoWaba()
    await expect(client.getAnalytics(0, 1)).rejects.toThrow("wabaId is required")
  })
})
