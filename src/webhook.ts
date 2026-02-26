// ---------------------------------------------------------------------------
// @saimonventura/waba — Webhook verification & event parsing
// ---------------------------------------------------------------------------

import type {
  WebhookEvent,
  InboundMessage,
  StatusUpdate,
  Contact,
  Metadata,
  RawWebhookPayload,
  WebhookError,
} from "./types.js";

// ── Verify Webhook ────────────────────────────────────────────────────────

export interface VerifyQuery {
  "hub.mode"?: string;
  "hub.verify_token"?: string;
  "hub.challenge"?: string;
}

/**
 * Validates a WhatsApp webhook verification request.
 * Returns the challenge string if mode is "subscribe" and the token matches.
 * Throws an error otherwise.
 */
export function verifyWebhook(query: VerifyQuery, verifyToken: string): string {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return challenge;
  }

  throw new Error("Webhook verification failed");
}

// ── Parse Webhook ─────────────────────────────────────────────────────────

/**
 * Parses a raw WhatsApp webhook body into typed WebhookEvent[].
 * Returns an empty array for any invalid/unrecognized payload (no throw).
 */
export function parseWebhook(body: unknown): WebhookEvent[] {
  if (!isValidPayload(body)) {
    return [];
  }

  const payload = body as RawWebhookPayload;
  const events: WebhookEvent[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const { value } = change;
      const metadata: Metadata = value.metadata;

      // Messages
      if (value.messages && Array.isArray(value.messages)) {
        const contacts = value.contacts ?? [];
        for (const msg of value.messages) {
          const contact = findContact(contacts, msg.from);
          events.push({
            type: "message",
            message: msg as InboundMessage,
            contact,
            metadata,
          });
        }
      }

      // Statuses
      if (value.statuses && Array.isArray(value.statuses)) {
        for (const status of value.statuses) {
          events.push({
            type: "status",
            status: status as StatusUpdate,
            metadata,
          });
        }
      }

      // Errors (top-level, not inside statuses)
      if (value.errors && Array.isArray(value.errors) && value.errors.length > 0) {
        events.push({
          type: "error",
          errors: value.errors as WebhookError[],
          metadata,
        });
      }
    }
  }

  return events;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function isValidPayload(body: unknown): boolean {
  if (body == null || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;
  if (obj.object !== "whatsapp_business_account") return false;
  if (!Array.isArray(obj.entry)) return false;
  return true;
}

function findContact(contacts: Contact[], from: string): Contact {
  const match = contacts.find((c) => c.wa_id === from);
  if (match) return match;

  // Fallback: return first contact or a synthetic one
  if (contacts.length > 0) return contacts[0];
  return { profile: { name: "" }, wa_id: from };
}
