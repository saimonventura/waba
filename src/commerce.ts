import type {
  CatalogOrderWebhook,
  Contact,
  InboundMessage,
  Metadata,
  OrderProductItem,
  RetailerIdKind,
  WebhookEvent,
  WhatsAppOrderStatusValue,
} from "./types.js"

type OrderMessage = Extract<InboundMessage, { type: "order" }>

const ORDER_STATUS_MAP: Record<string, WhatsAppOrderStatusValue | null> = {
  pending: "pending",
  accepted: "processing",
  preparing: "processing",
  ready_for_pickup: "processing",
  processing: "processing",
  out_for_delivery: "shipped",
  shipped: "shipped",
  partially_shipped: "partially-shipped",
  "partially-shipped": "partially-shipped",
  delivered: "completed",
  completed: "completed",
  rejected: "canceled",
  cancelled: "canceled",
  canceled: "canceled",
  ignored: null,
}

export function isOrderMessage(message: InboundMessage): message is OrderMessage {
  return (
    message.type === "order" &&
    typeof (message as OrderMessage).order?.catalog_id === "string" &&
    hasValidOrderItems((message as OrderMessage).order?.product_items)
  )
}

export function isCatalogOrderEvent(
  event: WebhookEvent,
): event is Extract<WebhookEvent, { type: "message" }> & { message: OrderMessage } {
  return event.type === "message" && isOrderMessage(event.message)
}

export function parseCatalogOrderEvent(event: WebhookEvent): CatalogOrderWebhook | null {
  if (!isCatalogOrderEvent(event)) return null
  return parseCatalogOrderMessage(event.message, {
    contact: event.contact,
    metadata: event.metadata,
  })
}

export function parseCatalogOrderMessage(
  message: InboundMessage,
  context: { contact?: Contact; metadata?: Metadata } = {},
): CatalogOrderWebhook | null {
  if (!isOrderMessage(message)) return null

  return {
    messageId: message.id,
    from: message.from,
    waId: context.contact?.wa_id,
    phoneNumberId: context.metadata?.phone_number_id,
    displayPhoneNumber: context.metadata?.display_phone_number,
    contactName: context.contact?.profile.name,
    timestamp: message.timestamp,
    catalogId: message.order.catalog_id,
    text: message.order.text,
    productItems: message.order.product_items,
    raw: message,
  }
}

export function productRetailerId(id: string | number): string {
  return retailerId("product", id)
}

export function variantRetailerId(id: string | number): string {
  return retailerId("variant", id)
}

export function parseRetailerId(value: string): { kind: RetailerIdKind; id: string } | null {
  const parts = value.split(":")
  if (parts.length !== 2) return null

  const [kind, id] = parts
  if ((kind !== "product" && kind !== "variant") || id.length === 0) return null
  return { kind, id }
}

export function toWhatsAppOrderStatus(status: string): WhatsAppOrderStatusValue | null {
  const normalized = status.trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(ORDER_STATUS_MAP, normalized)
    ? ORDER_STATUS_MAP[normalized]
    : null
}

export function canSendOrderStatus(status: string): boolean {
  return toWhatsAppOrderStatus(status) !== null
}

function retailerId(kind: RetailerIdKind, id: string | number): string {
  const value = String(id).trim()
  if (value.length === 0) {
    throw new Error("retailer id must not be empty")
  }
  if (value.includes(":")) {
    throw new Error("retailer id must not include ':'")
  }
  return `${kind}:${value}`
}

function hasValidOrderItems(value: unknown): value is OrderProductItem[] {
  return Array.isArray(value) && value.length > 0 && value.every(isValidOrderProductItem)
}

function isValidOrderProductItem(value: unknown): value is OrderProductItem {
  if (value == null || typeof value !== "object") return false
  const item = value as Partial<OrderProductItem>
  const quantity = item.quantity
  const itemPrice = item.item_price
  return (
    typeof item.product_retailer_id === "string" &&
    item.product_retailer_id.trim().length > 0 &&
    Number.isInteger(quantity) &&
    quantity !== undefined &&
    quantity > 0 &&
    Number.isFinite(itemPrice) &&
    itemPrice !== undefined &&
    itemPrice >= 0 &&
    typeof item.currency === "string" &&
    item.currency.trim().length > 0
  )
}
