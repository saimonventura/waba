// ---------------------------------------------------------------------------
// @saimonventura/waba — Error code classification & retry hints
// Maps Meta's WhatsApp API error codes to categories and retry strategies.
// ---------------------------------------------------------------------------

export type ErrorCategory =
  | "throttling"
  | "auth"
  | "integrity"
  | "parameter"
  | "reengagement"
  | "billing"
  | "recipient"
  | "template"
  | "media"
  | "system"
  | "message"
  | "registration"
  | "unknown"

export type RetryHint =
  | "retry"
  | "retry_after"
  | "do_not_retry"
  | "fix_and_retry"
  | "refresh_token"

interface ErrorClassification {
  category: ErrorCategory
  retryHint: RetryHint
}

export const ERROR_MAP = new Map<number, ErrorClassification>([
  // System errors
  [0, { category: "system", retryHint: "retry" }],
  [2, { category: "system", retryHint: "retry" }],
  [506, { category: "system", retryHint: "retry" }],
  [131000, { category: "system", retryHint: "retry" }],
  [131016, { category: "system", retryHint: "retry" }],
  [135000, { category: "system", retryHint: "retry" }],

  // Throttling
  [4, { category: "throttling", retryHint: "retry_after" }],
  [131030, { category: "throttling", retryHint: "retry_after" }],
  [130429, { category: "throttling", retryHint: "retry_after" }],

  // Auth
  [10, { category: "auth", retryHint: "fix_and_retry" }],
  [190, { category: "auth", retryHint: "refresh_token" }],
  [200, { category: "auth", retryHint: "fix_and_retry" }],
  [131005, { category: "auth", retryHint: "fix_and_retry" }],

  // Integrity
  [368, { category: "integrity", retryHint: "retry_after" }],
  [131031, { category: "integrity", retryHint: "do_not_retry" }],

  // Parameter
  [100, { category: "parameter", retryHint: "fix_and_retry" }],
  [131008, { category: "parameter", retryHint: "fix_and_retry" }],
  [131009, { category: "parameter", retryHint: "fix_and_retry" }],

  // Recipient
  [131021, { category: "recipient", retryHint: "do_not_retry" }],
  [131026, { category: "recipient", retryHint: "do_not_retry" }],
  [131045, { category: "recipient", retryHint: "do_not_retry" }],
  [131057, { category: "recipient", retryHint: "do_not_retry" }],
  [130472, { category: "recipient", retryHint: "do_not_retry" }],

  // Re-engagement window
  [131047, { category: "reengagement", retryHint: "do_not_retry" }],

  // Billing
  [131042, { category: "billing", retryHint: "do_not_retry" }],
  [131056, { category: "billing", retryHint: "do_not_retry" }],

  // Message
  [131051, { category: "message", retryHint: "fix_and_retry" }],

  // Media
  [131052, { category: "media", retryHint: "fix_and_retry" }],
  [131053, { category: "media", retryHint: "fix_and_retry" }],

  // Template
  [131048, { category: "template", retryHint: "fix_and_retry" }],
  [131049, { category: "template", retryHint: "fix_and_retry" }],
  [132000, { category: "template", retryHint: "fix_and_retry" }],
  [132001, { category: "template", retryHint: "fix_and_retry" }],
  [132005, { category: "template", retryHint: "fix_and_retry" }],
  [132007, { category: "template", retryHint: "fix_and_retry" }],
  [132012, { category: "template", retryHint: "fix_and_retry" }],
  [132015, { category: "template", retryHint: "fix_and_retry" }],
  [132068, { category: "template", retryHint: "fix_and_retry" }],
  [132069, { category: "template", retryHint: "fix_and_retry" }],

  // Registration
  [133000, { category: "registration", retryHint: "fix_and_retry" }],
  [133004, { category: "registration", retryHint: "fix_and_retry" }],
  [133005, { category: "registration", retryHint: "do_not_retry" }],
  [133006, { category: "registration", retryHint: "fix_and_retry" }],
  [133010, { category: "registration", retryHint: "do_not_retry" }],
])

export function classifyError(code: number, httpStatus: number): ErrorClassification {
  const known = ERROR_MAP.get(code)
  if (known) return known

  // Fallback heuristics based on HTTP status
  if (httpStatus === 429) return { category: "throttling", retryHint: "retry_after" }
  if (httpStatus === 401) return { category: "auth", retryHint: "refresh_token" }
  if (httpStatus >= 500) return { category: "system", retryHint: "retry" }

  return { category: "unknown", retryHint: "retry" }
}
