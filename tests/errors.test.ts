import { describe, it, expect } from "vitest"
import { WhatsAppError } from "../src/errors.js"

describe("WhatsAppError", () => {
  it("should create error with Meta error fields", () => {
    const err = new WhatsAppError({
      message: "Re-engagement message",
      code: 131047,
      title: "Re-engagement message",
      httpStatus: 400,
    })
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(WhatsAppError)
    expect(err.message).toBe("Re-engagement message")
    expect(err.code).toBe(131047)
    expect(err.title).toBe("Re-engagement message")
    expect(err.httpStatus).toBe(400)
    expect(err.name).toBe("WhatsAppError")
  })

  it("should include details when provided", () => {
    const err = new WhatsAppError({
      message: "Invalid parameter",
      code: 100,
      title: "Invalid parameter",
      httpStatus: 400,
      details: "The phone number is not valid",
    })
    expect(err.details).toBe("The phone number is not valid")
  })

  it("should create from Meta API error response", () => {
    const metaResponse = {
      error: {
        message: "(#131030) Recipient phone number not in allowed list",
        type: "OAuthException",
        code: 131030,
        error_subcode: 2494010,
        fbtrace_id: "abc123",
      },
    }
    const err = WhatsAppError.fromApiResponse(metaResponse, 400)
    expect(err.code).toBe(131030)
    expect(err.httpStatus).toBe(400)
    expect(err.message).toContain("131030")
    expect(err.title).toBe("131030/2494010")
    expect(err.details).toBe("fbtrace_id: abc123")
  })

  it("should handle empty error response gracefully", () => {
    const err = WhatsAppError.fromApiResponse({}, 500)
    expect(err.code).toBe(0)
    expect(err.httpStatus).toBe(500)
    expect(err.message).toBe("Unknown WhatsApp API error")
  })
})
