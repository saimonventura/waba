import { describe, expect, it } from "vitest"
import {
  canSendOrderStatus,
  isCatalogOrderEvent,
  parseCatalogOrderEvent,
  parseCatalogOrderMessage,
  parseRetailerId,
  productRetailerId,
  toWhatsAppOrderStatus,
  variantRetailerId,
} from "../src/index.js"
import type { InboundMessage, WebhookEvent } from "../src/index.js"

const orderMessage = {
  from: "5511999887766",
  id: "wamid.order1",
  timestamp: "1740000100",
  type: "order",
  order: {
    catalog_id: "CAT_001",
    text: "Pode separar por favor",
    product_items: [
      {
        product_retailer_id: "variant:529-1kg",
        quantity: 2,
        item_price: 3590,
        currency: "BRL",
      },
    ],
  },
} satisfies InboundMessage

const orderEvent = {
  type: "message",
  message: orderMessage,
  contact: { profile: { name: "Joao" }, wa_id: "5511999887766" },
  metadata: {
    display_phone_number: "5511999999999",
    phone_number_id: "123456789",
  },
} satisfies WebhookEvent

describe("catalog order webhook helpers", () => {
  it("identifies order events parsed from webhook payloads", () => {
    expect(isCatalogOrderEvent(orderEvent)).toBe(true)
    expect(isCatalogOrderEvent({
      ...orderEvent,
      message: { ...orderMessage, type: "text", text: { body: "oi" } },
    } as WebhookEvent)).toBe(false)
  })

  it("normalizes a catalog order event into commerce-friendly fields", () => {
    const result = parseCatalogOrderEvent(orderEvent)

    expect(result).toEqual({
      messageId: "wamid.order1",
      from: "5511999887766",
      waId: "5511999887766",
      phoneNumberId: "123456789",
      displayPhoneNumber: "5511999999999",
      contactName: "Joao",
      timestamp: "1740000100",
      catalogId: "CAT_001",
      text: "Pode separar por favor",
      productItems: [
        {
          product_retailer_id: "variant:529-1kg",
          quantity: 2,
          item_price: 3590,
          currency: "BRL",
        },
      ],
      raw: orderMessage,
    })
  })

  it("normalizes a bare order message with optional context", () => {
    const result = parseCatalogOrderMessage(orderMessage, {
      contact: orderEvent.contact,
      metadata: orderEvent.metadata,
    })

    expect(result?.catalogId).toBe("CAT_001")
    expect(result?.contactName).toBe("Joao")
    expect(result?.phoneNumberId).toBe("123456789")
  })

  it("returns null for non-order messages and events", () => {
    const textMessage = {
      ...orderMessage,
      type: "text",
      text: { body: "oi" },
    } as InboundMessage

    expect(parseCatalogOrderMessage(textMessage)).toBeNull()
    expect(parseCatalogOrderEvent({
      type: "status",
      status: {
        id: "wamid.status1",
        status: "delivered",
        timestamp: "1740000101",
        recipient_id: "5511999887766",
      },
      metadata: orderEvent.metadata,
    })).toBeNull()
  })

  it("returns null for malformed catalog order items", () => {
    const malformedOrder = {
      ...orderMessage,
      order: {
        ...orderMessage.order,
        product_items: [
          {
            product_retailer_id: "product:529",
            quantity: 0,
            item_price: 3590,
            currency: "BRL",
          },
        ],
      },
    } as InboundMessage

    expect(parseCatalogOrderMessage(malformedOrder)).toBeNull()
  })
})

describe("retailer id helpers", () => {
  it("creates reversible product and variant retailer ids", () => {
    expect(productRetailerId(529)).toBe("product:529")
    expect(variantRetailerId("529-1kg")).toBe("variant:529-1kg")

    expect(parseRetailerId("product:529")).toEqual({ kind: "product", id: "529" })
    expect(parseRetailerId("variant:529-1kg")).toEqual({ kind: "variant", id: "529-1kg" })
  })

  it("rejects empty or ambiguous retailer ids", () => {
    expect(() => productRetailerId("")).toThrow("retailer id must not be empty")
    expect(() => variantRetailerId("529:1kg")).toThrow("retailer id must not include ':'")
    expect(parseRetailerId("529")).toBeNull()
    expect(parseRetailerId("sku:529")).toBeNull()
    expect(parseRetailerId("product:")).toBeNull()
  })
})

describe("order lifecycle status mapping", () => {
  it("maps internal commerce lifecycle statuses to WhatsApp order_status values", () => {
    expect(toWhatsAppOrderStatus("pending")).toBe("pending")
    expect(toWhatsAppOrderStatus("accepted")).toBe("processing")
    expect(toWhatsAppOrderStatus("preparing")).toBe("processing")
    expect(toWhatsAppOrderStatus("ready_for_pickup")).toBe("processing")
    expect(toWhatsAppOrderStatus("out_for_delivery")).toBe("shipped")
    expect(toWhatsAppOrderStatus("completed")).toBe("completed")
    expect(toWhatsAppOrderStatus("rejected")).toBe("canceled")
    expect(toWhatsAppOrderStatus("cancelled")).toBe("canceled")
  })

  it("returns null for statuses that should not emit WhatsApp order_status", () => {
    expect(toWhatsAppOrderStatus("ignored")).toBeNull()
    expect(toWhatsAppOrderStatus("draft")).toBeNull()
    expect(canSendOrderStatus("ignored")).toBe(false)
    expect(canSendOrderStatus("completed")).toBe(true)
  })
})
