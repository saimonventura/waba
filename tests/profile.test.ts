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
  const call = mock.mock.calls[0]
  return JSON.parse(call[1].body)
}

function parseFetchUrl(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][0]
}

describe("Business Profile & Phone Numbers", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ── getBusinessProfile ──

  it("should get business profile with default fields", async () => {
    const profileData = {
      data: [{ about: "Test business", description: "A test", email: "test@example.com" }],
    }
    const mock = mockFetch(profileData)
    const client = createClient()

    const result = await client.getBusinessProfile()

    const url = parseFetchUrl(mock)
    expect(url).toContain(`${PHONE_ID}/whatsapp_business_profile?fields=`)
    expect(url).toContain("about")
    expect(url).toContain("address")
    expect(url).toContain("description")
    expect(url).toContain("email")
    expect(url).toContain("websites")
    expect(url).toContain("vertical")
    expect(url).toContain("profile_picture_url")
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(profileData.data[0])
  })

  it("should get business profile with custom fields", async () => {
    const profileData = { data: [{ about: "Hello" }] }
    const mock = mockFetch(profileData)
    const client = createClient()

    const result = await client.getBusinessProfile(["about", "email"])

    const url = parseFetchUrl(mock)
    expect(url).toBe(`${BASE_URL}/${PHONE_ID}/whatsapp_business_profile?fields=about,email`)
    expect(result).toEqual({ about: "Hello" })
  })

  // ── updateBusinessProfile ──

  it("should update business profile with partial data", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.updateBusinessProfile({ about: "New about", description: "Updated desc" })

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/whatsapp_business_profile`)
    expect(parseFetchBody(mock)).toEqual({
      messaging_product: "whatsapp",
      about: "New about",
      description: "Updated desc",
    })
  })

  // ── getPhoneInfo ──

  it("should get phone info with GET request", async () => {
    const phoneData = {
      verified_name: "Test Business",
      display_phone_number: "+5514997207735",
      quality_rating: "GREEN",
      id: PHONE_ID,
    }
    const mock = mockFetch(phoneData)
    const client = createClient()

    const result = await client.getPhoneInfo()

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}`)
    expect(mock.mock.calls[0][1].method).toBe("GET")
    expect(result).toEqual(phoneData)
  })

  // ── registerPhone ──

  it("should register phone with pin", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.registerPhone("123456")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/register`)
    expect(parseFetchBody(mock)).toEqual({
      messaging_product: "whatsapp",
      pin: "123456",
    })
  })

  // ── deregisterPhone ──

  it("should deregister phone", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.deregisterPhone()

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/deregister`)
    expect(parseFetchBody(mock)).toEqual({ messaging_product: "whatsapp" })
  })

  // ── requestVerificationCode ──

  it("should request verification code via SMS", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.requestVerificationCode("SMS")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/request_code`)
    expect(parseFetchBody(mock)).toEqual({ code_method: "SMS" })
  })

  // ── verifyCode ──

  it("should verify code", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.verifyCode("123456")

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PHONE_ID}/verify_code`)
    expect(parseFetchBody(mock)).toEqual({ code: "123456" })
  })
})
