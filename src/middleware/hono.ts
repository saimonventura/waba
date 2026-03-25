import { verifyWebhook, validateSignature, parseWebhook } from "../webhook.js"
import type { WebhookHandlers } from "./types.js"

export interface HonoMiddlewareConfig extends WebhookHandlers {
  verifyToken: string
  appSecret?: string
}

/**
 * Hono middleware for WhatsApp webhooks.
 * Handles GET (verification) and POST (events).
 * HMAC verification works natively — no extra setup needed.
 */
export function honoMiddleware(config: HonoMiddlewareConfig) {
  return async (c: any) => {
    if (c.req.method === "GET") {
      try {
        return c.text(verifyWebhook(c.req.query(), config.verifyToken))
      } catch {
        return c.text("Forbidden", 403)
      }
    }

    const rawBody = await c.req.text()

    if (config.appSecret) {
      const sig = c.req.header("x-hub-signature-256")
      if (!sig || !validateSignature(rawBody, sig, config.appSecret)) {
        return c.text("Unauthorized", 401)
      }
    }

    const body = JSON.parse(rawBody)
    const events = parseWebhook(body)

    for (const event of events) {
      if (event.type === "message") await config.onMessage?.(event as any)
      else if (event.type === "status") await config.onStatus?.(event as any)
      else if (event.type === "error") await config.onError?.(event as any)
    }
    return c.text("OK", 200)
  }
}

export type { MessageEvent, StatusEvent, ErrorEvent, WebhookHandlers } from "./types.js"
