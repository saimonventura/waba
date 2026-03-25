import { verifyWebhook, validateSignature, parseWebhook } from "../webhook.js"
import type { WebhookHandlers } from "./types.js"

export interface ExpressMiddlewareConfig extends WebhookHandlers {
  verifyToken: string
  appSecret?: string
}

/**
 * Express/Connect middleware for WhatsApp webhooks.
 * Handles GET (verification) and POST (events).
 *
 * For HMAC verification, capture rawBody:
 * ```
 * app.use("/webhook", express.json({
 *   verify: (req, _res, buf) => { (req as any).rawBody = buf }
 * }))
 * ```
 */
export function expressMiddleware(config: ExpressMiddlewareConfig) {
  return async (req: any, res: any) => {
    if (req.method === "GET") {
      try {
        return res.send(verifyWebhook(req.query, config.verifyToken))
      } catch {
        return res.sendStatus(403)
      }
    }

    if (config.appSecret) {
      const sig = req.headers["x-hub-signature-256"]
      const rawBody: Buffer | undefined = req.rawBody
      if (!sig || !rawBody || !validateSignature(rawBody, sig, config.appSecret)) {
        return res.sendStatus(401)
      }
    }

    const events = parseWebhook(req.body)
    for (const event of events) {
      if (event.type === "message") await config.onMessage?.(event as any)
      else if (event.type === "status") await config.onStatus?.(event as any)
      else if (event.type === "error") await config.onError?.(event as any)
    }
    res.sendStatus(200)
  }
}

export type { MessageEvent, StatusEvent, ErrorEvent, WebhookHandlers } from "./types.js"
