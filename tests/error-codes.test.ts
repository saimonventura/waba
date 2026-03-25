import { describe, it, expect, vi, beforeEach } from "vitest"
import { classifyError, ERROR_MAP } from "../src/error-codes.js"
import { WhatsAppError } from "../src/errors.js"

describe("classifyError", () => {
  it("should classify known throttling codes", () => {
    expect(classifyError(4, 429)).toEqual({ category: "throttling", retryHint: "retry_after" })
    expect(classifyError(131030, 400)).toEqual({ category: "throttling", retryHint: "retry_after" })
    expect(classifyError(130429, 429)).toEqual({ category: "throttling", retryHint: "retry_after" })
  })

  it("should classify auth codes", () => {
    expect(classifyError(190, 401)).toEqual({ category: "auth", retryHint: "refresh_token" })
    expect(classifyError(10, 403)).toEqual({ category: "auth", retryHint: "fix_and_retry" })
  })

  it("should classify recipient codes as do_not_retry", () => {
    expect(classifyError(131021, 400)).toEqual({ category: "recipient", retryHint: "do_not_retry" })
    expect(classifyError(131047, 400)).toEqual({ category: "reengagement", retryHint: "do_not_retry" })
    expect(classifyError(130472, 400)).toEqual({ category: "recipient", retryHint: "do_not_retry" })
  })

  it("should classify template codes", () => {
    expect(classifyError(132000, 400)).toEqual({ category: "template", retryHint: "fix_and_retry" })
    expect(classifyError(132069, 400)).toEqual({ category: "template", retryHint: "fix_and_retry" })
  })

  it("should classify system codes", () => {
    expect(classifyError(2, 500)).toEqual({ category: "system", retryHint: "retry" })
    expect(classifyError(131000, 500)).toEqual({ category: "system", retryHint: "retry" })
  })

  it("should classify billing codes", () => {
    expect(classifyError(131042, 400)).toEqual({ category: "billing", retryHint: "do_not_retry" })
    expect(classifyError(131056, 400)).toEqual({ category: "billing", retryHint: "do_not_retry" })
  })

  it("should classify registration codes", () => {
    expect(classifyError(133000, 400)).toEqual({ category: "registration", retryHint: "fix_and_retry" })
    expect(classifyError(133005, 400)).toEqual({ category: "registration", retryHint: "do_not_retry" })
  })

  // Fallback heuristics
  it("should fallback HTTP 429 to throttling", () => {
    expect(classifyError(999999, 429)).toEqual({ category: "throttling", retryHint: "retry_after" })
  })

  it("should fallback HTTP 401 to auth/refresh_token", () => {
    expect(classifyError(999999, 401)).toEqual({ category: "auth", retryHint: "refresh_token" })
  })

  it("should fallback HTTP 5xx to system/retry", () => {
    expect(classifyError(999999, 500)).toEqual({ category: "system", retryHint: "retry" })
    expect(classifyError(999999, 503)).toEqual({ category: "system", retryHint: "retry" })
  })

  it("should fallback unknown to unknown/retry", () => {
    expect(classifyError(999999, 400)).toEqual({ category: "unknown", retryHint: "retry" })
  })
})

describe("WhatsAppError with classification", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("should populate category and retryHint from fromApiResponse", () => {
    const err = WhatsAppError.fromApiResponse(
      { error: { message: "Rate limit hit", code: 131030 } },
      429,
    )
    expect(err.category).toBe("throttling")
    expect(err.retryHint).toBe("retry_after")
    expect(err.code).toBe(131030)
    expect(err.httpStatus).toBe(429)
  })

  it("should populate category for auth errors", () => {
    const err = WhatsAppError.fromApiResponse(
      { error: { message: "Token expired", code: 190 } },
      401,
    )
    expect(err.category).toBe("auth")
    expect(err.retryHint).toBe("refresh_token")
  })

  it("should default to unknown for manual construction", () => {
    const err = new WhatsAppError({
      message: "Custom error",
      code: 0,
      title: "custom",
      httpStatus: 400,
    })
    expect(err.category).toBe("unknown")
    expect(err.retryHint).toBe("retry")
  })

  it("should allow explicit category in constructor", () => {
    const err = new WhatsAppError({
      message: "Custom",
      code: 0,
      title: "custom",
      httpStatus: 400,
      category: "media",
      retryHint: "fix_and_retry",
    })
    expect(err.category).toBe("media")
    expect(err.retryHint).toBe("fix_and_retry")
  })
})

describe("ERROR_MAP", () => {
  it("should have 40+ entries", () => {
    expect(ERROR_MAP.size).toBeGreaterThanOrEqual(40)
  })
})
