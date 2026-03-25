import { classifyError } from "./error-codes.js"
import type { ErrorCategory, RetryHint } from "./error-codes.js"

interface WhatsAppErrorOptions {
  message: string
  code: number
  title: string
  httpStatus: number
  details?: string
  category?: ErrorCategory
  retryHint?: RetryHint
}

export class WhatsAppError extends Error {
  readonly code: number
  readonly title: string
  readonly httpStatus: number
  readonly details?: string
  readonly category: ErrorCategory
  readonly retryHint: RetryHint

  constructor(options: WhatsAppErrorOptions) {
    super(options.message)
    this.name = "WhatsAppError"
    this.code = options.code
    this.title = options.title
    this.httpStatus = options.httpStatus
    this.details = options.details
    this.category = options.category ?? "unknown"
    this.retryHint = options.retryHint ?? "retry"
  }

  static fromApiResponse(body: any, httpStatus: number): WhatsAppError {
    const err = body?.error || {}
    const code = err.code || 0
    const { category, retryHint } = classifyError(code, httpStatus)
    return new WhatsAppError({
      message: err.message || "Unknown WhatsApp API error",
      code,
      title: err.error_subcode ? `${err.code}/${err.error_subcode}` : String(err.code || "unknown"),
      httpStatus,
      details: err.fbtrace_id ? `fbtrace_id: ${err.fbtrace_id}` : undefined,
      category,
      retryHint,
    })
  }
}
