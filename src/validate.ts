// ---------------------------------------------------------------------------
// @saimonventura/waba — Input validation for Meta's WhatsApp API limits
// ---------------------------------------------------------------------------

export const LIMITS = {
  TEXT_BODY: 4096,
  INTERACTIVE_BODY: 1024,
  BUTTON_TITLE: 20,
  BUTTON_ID: 256,
  BUTTONS_MAX: 3,
  LIST_SECTIONS_MAX: 10,
  LIST_ROWS_PER_SECTION: 10,
  LIST_SECTION_TITLE: 24,
  LIST_ROW_TITLE: 24,
  LIST_ROW_DESCRIPTION: 72,
  HEADER: 60,
  FOOTER: 60,
  CTA_DISPLAY_TEXT: 20,
  CTA_URL: 2000,
} as const

export class ValidationError extends Error {
  readonly field: string
  readonly limit: number

  constructor(message: string, field: string, limit: number) {
    super(message)
    this.name = "ValidationError"
    this.field = field
    this.limit = limit
  }
}

function checkLength(value: string, max: number, field: string): void {
  if (value.length > max) {
    throw new ValidationError(
      `${field} exceeds ${max} chars (got ${value.length})`,
      field,
      max,
    )
  }
}

export function validateText(body: string): void {
  checkLength(body, LIMITS.TEXT_BODY, "Text body")
}

export function validateInteractiveBody(body: string): void {
  checkLength(body, LIMITS.INTERACTIVE_BODY, "Interactive body")
}

export function validateHeaderFooter(header?: string, footer?: string): void {
  if (header) checkLength(header, LIMITS.HEADER, "Header")
  if (footer) checkLength(footer, LIMITS.FOOTER, "Footer")
}

export function validateButtons(buttons: { id: string; title: string }[], body?: string, header?: string, footer?: string): void {
  if (buttons.length > LIMITS.BUTTONS_MAX) {
    throw new ValidationError(
      `Maximum ${LIMITS.BUTTONS_MAX} buttons allowed (got ${buttons.length})`,
      "buttons",
      LIMITS.BUTTONS_MAX,
    )
  }
  for (const btn of buttons) {
    checkLength(btn.title, LIMITS.BUTTON_TITLE, "Button title")
    checkLength(btn.id, LIMITS.BUTTON_ID, "Button ID")
  }
  if (body) validateInteractiveBody(body)
  validateHeaderFooter(header, footer)
}

export function validateList(
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
  body?: string,
  header?: string,
  footer?: string,
): void {
  if (sections.length > LIMITS.LIST_SECTIONS_MAX) {
    throw new ValidationError(
      `Maximum ${LIMITS.LIST_SECTIONS_MAX} sections allowed (got ${sections.length})`,
      "sections",
      LIMITS.LIST_SECTIONS_MAX,
    )
  }
  for (const section of sections) {
    checkLength(section.title, LIMITS.LIST_SECTION_TITLE, "Section title")
    if (section.rows.length > LIMITS.LIST_ROWS_PER_SECTION) {
      throw new ValidationError(
        `Maximum ${LIMITS.LIST_ROWS_PER_SECTION} rows per section (got ${section.rows.length})`,
        "rows",
        LIMITS.LIST_ROWS_PER_SECTION,
      )
    }
    for (const row of section.rows) {
      checkLength(row.title, LIMITS.LIST_ROW_TITLE, "Row title")
      if (row.description) checkLength(row.description, LIMITS.LIST_ROW_DESCRIPTION, "Row description")
    }
  }
  if (body) validateInteractiveBody(body)
  validateHeaderFooter(header, footer)
}

export function validateCTA(displayText: string, url: string): void {
  checkLength(displayText, LIMITS.CTA_DISPLAY_TEXT, "CTA display text")
  checkLength(url, LIMITS.CTA_URL, "CTA URL")
}
