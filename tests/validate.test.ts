import { describe, it, expect, vi, beforeEach } from "vitest"
import { WhatsApp } from "../src/client.js"
import { ValidationError, LIMITS, validateText, validateButtons, validateList, validateCTA } from "../src/validate.js"

const PHONE_ID = "123456789"
const TOKEN = "test-token"

function createValidatingClient() {
  return new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, validate: true })
}

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

describe("validateText", () => {
  it("should pass for valid text", () => {
    expect(() => validateText("Hello")).not.toThrow()
  })

  it("should pass at exact limit", () => {
    expect(() => validateText("x".repeat(LIMITS.TEXT_BODY))).not.toThrow()
  })

  it("should throw for text exceeding limit", () => {
    expect(() => validateText("x".repeat(LIMITS.TEXT_BODY + 1))).toThrow(ValidationError)
  })

  it("should include field and limit in error", () => {
    try {
      validateText("x".repeat(5000))
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError)
      const ve = err as ValidationError
      expect(ve.field).toBe("Text body")
      expect(ve.limit).toBe(4096)
      expect(ve.message).toContain("5000")
    }
  })
})

describe("validateButtons", () => {
  it("should pass for valid buttons", () => {
    expect(() => validateButtons([
      { id: "1", title: "Yes" },
      { id: "2", title: "No" },
    ])).not.toThrow()
  })

  it("should throw for more than 3 buttons", () => {
    expect(() => validateButtons([
      { id: "1", title: "A" },
      { id: "2", title: "B" },
      { id: "3", title: "C" },
      { id: "4", title: "D" },
    ])).toThrow(ValidationError)
  })

  it("should throw for button title exceeding limit", () => {
    expect(() => validateButtons([
      { id: "1", title: "x".repeat(21) },
    ])).toThrow(ValidationError)
  })

  it("should throw for interactive body exceeding limit", () => {
    expect(() => validateButtons(
      [{ id: "1", title: "Ok" }],
      "x".repeat(1025),
    )).toThrow(ValidationError)
  })

  it("should throw for header exceeding limit", () => {
    expect(() => validateButtons(
      [{ id: "1", title: "Ok" }],
      "body",
      "x".repeat(61),
    )).toThrow(ValidationError)
  })
})

describe("validateList", () => {
  it("should pass for valid list", () => {
    expect(() => validateList([
      { title: "Section", rows: [{ id: "1", title: "Item" }] },
    ])).not.toThrow()
  })

  it("should throw for more than 10 sections", () => {
    const sections = Array.from({ length: 11 }, (_, i) => ({
      title: `S${i}`, rows: [{ id: `${i}`, title: "Item" }],
    }))
    expect(() => validateList(sections)).toThrow(ValidationError)
  })

  it("should throw for more than 10 rows per section", () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({ id: `${i}`, title: "Item" }))
    expect(() => validateList([{ title: "Section", rows }])).toThrow(ValidationError)
  })

  it("should throw for row description exceeding limit", () => {
    expect(() => validateList([
      { title: "Section", rows: [{ id: "1", title: "Item", description: "x".repeat(73) }] },
    ])).toThrow(ValidationError)
  })
})

describe("validateCTA", () => {
  it("should pass for valid CTA", () => {
    expect(() => validateCTA("Open", "https://example.com")).not.toThrow()
  })

  it("should throw for display text exceeding limit", () => {
    expect(() => validateCTA("x".repeat(21), "https://example.com")).toThrow(ValidationError)
  })
})

describe("Client with validate: true", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("should throw before API call for invalid text", async () => {
    const client = createValidatingClient()
    // No mock needed — should throw before fetch
    await expect(client.sendText("5511999999999", "x".repeat(5000))).rejects.toThrow(ValidationError)
  })

  it("should throw for too many buttons", async () => {
    const client = createValidatingClient()
    await expect(client.sendButtons("5511999999999", "Pick", [
      { id: "1", title: "A" },
      { id: "2", title: "B" },
      { id: "3", title: "C" },
      { id: "4", title: "D" },
    ])).rejects.toThrow(ValidationError)
  })

  it("should pass through when validate is false (default)", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()
    // Should NOT throw even with invalid text — validation is off
    await client.sendText("5511999999999", "x".repeat(5000))
    expect(mock).toHaveBeenCalledTimes(1)
  })
})

describe("LIMITS", () => {
  it("should export all expected limits", () => {
    expect(LIMITS.TEXT_BODY).toBe(4096)
    expect(LIMITS.INTERACTIVE_BODY).toBe(1024)
    expect(LIMITS.BUTTON_TITLE).toBe(20)
    expect(LIMITS.BUTTONS_MAX).toBe(3)
    expect(LIMITS.LIST_SECTIONS_MAX).toBe(10)
    expect(LIMITS.HEADER).toBe(60)
    expect(LIMITS.FOOTER).toBe(60)
  })
})
