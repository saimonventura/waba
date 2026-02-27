interface WhatsAppErrorOptions {
  message: string
  code: number
  title: string
  httpStatus: number
  details?: string
}

export class WhatsAppError extends Error {
  readonly code: number
  readonly title: string
  readonly httpStatus: number
  readonly details?: string

  constructor(options: WhatsAppErrorOptions) {
    super(options.message)
    this.name = "WhatsAppError"
    this.code = options.code
    this.title = options.title
    this.httpStatus = options.httpStatus
    this.details = options.details
  }

  static fromApiResponse(body: any, httpStatus: number): WhatsAppError {
    const err = body?.error || {}
    return new WhatsAppError({
      message: err.message || "Unknown WhatsApp API error",
      code: err.code || 0,
      title: err.error_subcode ? `${err.code}/${err.error_subcode}` : String(err.code || "unknown"),
      httpStatus,
      details: err.fbtrace_id ? `fbtrace_id: ${err.fbtrace_id}` : undefined,
    })
  }
}
