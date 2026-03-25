import type { WebhookEvent } from "../types.js"

export type MessageEvent = Extract<WebhookEvent, { type: "message" }>
export type StatusEvent = Extract<WebhookEvent, { type: "status" }>
export type ErrorEvent = Extract<WebhookEvent, { type: "error" }>

export interface WebhookHandlers {
  onMessage?: (event: MessageEvent) => void | Promise<void>
  onStatus?: (event: StatusEvent) => void | Promise<void>
  onError?: (event: ErrorEvent) => void | Promise<void>
}
