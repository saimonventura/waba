import { describe, it, expect, vi, beforeEach } from "vitest"
import { WhatsApp } from "../src/client.js"

const PHONE_ID = "123456789"
const TOKEN = "test-token"
const API_VERSION = "v25.0"
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`

function createClient() {
  return new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN })
}

function mockFetch(responseBody: any, status = 200) {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
    headers: new Headers({ "content-type": "application/json" }),
  })
  globalThis.fetch = mock
  return mock
}

const SUCCESS = {
  messaging_product: "whatsapp",
  contacts: [{ input: "5511999999999", wa_id: "5511999999999" }],
  messages: [{ id: "wamid.test" }],
}

function parseFetchBody(mock: ReturnType<typeof vi.fn>): any {
  return JSON.parse(mock.mock.calls[0][1].body)
}

describe("Order Details (Payment)", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("should send order details with PIX payment", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderDetails("5511999999999", "Resumo do pedido", {
      referenceId: "order_123",
      paymentType: "br",
      paymentConfiguration: "config_pix",
      currency: "BRL",
      totalAmount: { value: 2990, offset: 100 },
      order: {
        status: "pending",
        catalog_id: "CAT_001",
        items: [{
          retailer_id: "burger_01",
          name: "Classic Burger",
          amount: { value: 1990, offset: 100 },
          quantity: 1,
        }],
        subtotal: { value: 1990, offset: 100 },
        tax: { value: 500, offset: 100 },
        shipping: { value: 500, offset: 100 },
      },
    }, { header: "Seu Pedido", footer: "Pague com PIX" })

    const body = parseFetchBody(mock)
    expect(body.type).toBe("interactive")
    expect(body.interactive.type).toBe("order_details")
    expect(body.interactive.header).toEqual({ type: "text", text: "Seu Pedido" })
    expect(body.interactive.body).toEqual({ text: "Resumo do pedido" })
    expect(body.interactive.footer).toEqual({ text: "Pague com PIX" })
    expect(body.interactive.action.name).toBe("review_and_pay")
    expect(body.interactive.action.parameters.reference_id).toBe("order_123")
    expect(body.interactive.action.parameters.payment_type).toBe("br")
    expect(body.interactive.action.parameters.payment_configuration).toBe("config_pix")
    expect(body.interactive.action.parameters.currency).toBe("BRL")
    expect(body.interactive.action.parameters.total_amount).toEqual({ value: 2990, offset: 100 })
    expect(body.interactive.action.parameters.order.items).toHaveLength(1)
    expect(body.interactive.action.parameters.order.subtotal).toEqual({ value: 1990, offset: 100 })
    expect(body.interactive.action.parameters.order.tax).toEqual({ value: 500, offset: 100 })
    expect(body.interactive.action.parameters.order.shipping).toEqual({ value: 500, offset: 100 })
    expect(body.interactive.action.parameters.order.catalog_id).toBe("CAT_001")
  })

  it("should send order details with minimal fields", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderDetails("5511999999999", "Pedido", {
      referenceId: "order_456",
      paymentType: "br",
      paymentConfiguration: "config_pix",
      currency: "BRL",
      totalAmount: { value: 1000, offset: 100 },
      order: {
        status: "pending",
        items: [{
          retailer_id: "item_1",
          name: "Item",
          amount: { value: 1000, offset: 100 },
          quantity: 1,
        }],
        subtotal: { value: 1000, offset: 100 },
      },
    })

    const body = parseFetchBody(mock)
    expect(body.interactive.action.parameters.order.tax).toBeUndefined()
    expect(body.interactive.action.parameters.order.shipping).toBeUndefined()
    expect(body.interactive.action.parameters.order.discount).toBeUndefined()
    expect(body.interactive.action.parameters.order.catalog_id).toBeUndefined()
    expect(body.interactive.header).toBeUndefined()
    expect(body.interactive.footer).toBeUndefined()
  })

  it("should send order details with UPI payment type", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderDetails("919999999999", "Order summary", {
      referenceId: "order_789",
      paymentType: "upi",
      paymentConfiguration: "config_upi",
      currency: "INR",
      totalAmount: { value: 50000, offset: 100 },
      order: {
        status: "pending",
        items: [{
          retailer_id: "product_1",
          name: "Product",
          amount: { value: 50000, offset: 100 },
          quantity: 1,
        }],
        subtotal: { value: 50000, offset: 100 },
      },
    })

    const body = parseFetchBody(mock)
    expect(body.interactive.action.parameters.payment_type).toBe("upi")
    expect(body.interactive.action.parameters.currency).toBe("INR")
  })

  it("should send order details with multiple items", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderDetails("5511999999999", "Seu pedido", {
      referenceId: "order_multi",
      paymentType: "br",
      paymentConfiguration: "config_pix",
      currency: "BRL",
      totalAmount: { value: 4980, offset: 100 },
      order: {
        status: "pending",
        items: [
          { retailer_id: "burger", name: "Burger", amount: { value: 1990, offset: 100 }, quantity: 1 },
          { retailer_id: "fries", name: "Fries", amount: { value: 990, offset: 100 }, quantity: 2 },
        ],
        subtotal: { value: 3970, offset: 100 },
        tax: { value: 510, offset: 100 },
        shipping: { value: 500, offset: 100 },
      },
    })

    const body = parseFetchBody(mock)
    expect(body.interactive.action.parameters.order.items).toHaveLength(2)
    expect(body.interactive.action.parameters.order.items[0].retailer_id).toBe("burger")
    expect(body.interactive.action.parameters.order.items[1].quantity).toBe(2)
  })

  it("should send order details with sale_amount on items", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderDetails("5511999999999", "Promo", {
      referenceId: "order_sale",
      paymentType: "br",
      paymentConfiguration: "config_pix",
      currency: "BRL",
      totalAmount: { value: 1490, offset: 100 },
      order: {
        status: "pending",
        items: [{
          retailer_id: "burger_01",
          name: "Burger",
          amount: { value: 1990, offset: 100 },
          sale_amount: { value: 1490, offset: 100 },
          quantity: 1,
        }],
        subtotal: { value: 1490, offset: 100 },
      },
    })

    const body = parseFetchBody(mock)
    expect(body.interactive.action.parameters.order.items[0].sale_amount).toEqual({ value: 1490, offset: 100 })
  })

  it("should send order details with expiration", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderDetails("5511999999999", "Pedido", {
      referenceId: "order_exp",
      paymentType: "br",
      paymentConfiguration: "config_pix",
      currency: "BRL",
      totalAmount: { value: 1000, offset: 100 },
      order: {
        status: "pending",
        items: [{ retailer_id: "x", name: "X", amount: { value: 1000, offset: 100 }, quantity: 1 }],
        subtotal: { value: 1000, offset: 100 },
        expiration: { timestamp: "1735689600", description: "Expires in 24h" },
      },
    })

    const body = parseFetchBody(mock)
    expect(body.interactive.action.parameters.order.expiration).toEqual({
      timestamp: "1735689600",
      description: "Expires in 24h",
    })
  })

  it("should default type to digital-goods", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderDetails("5511999999999", "Order", {
      referenceId: "order_type",
      paymentType: "br",
      paymentConfiguration: "config",
      currency: "BRL",
      totalAmount: { value: 100, offset: 100 },
      order: {
        status: "pending",
        items: [{ retailer_id: "x", name: "X", amount: { value: 100, offset: 100 }, quantity: 1 }],
        subtotal: { value: 100, offset: 100 },
      },
    })

    const body = parseFetchBody(mock)
    expect(body.interactive.action.parameters.type).toBe("digital-goods")
  })
})

describe("Order Status", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("should send order status completed", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderStatus("5511999999999", "Pagamento confirmado!", {
      referenceId: "order_123",
      order: { status: "completed", description: "PIX recebido" },
    })

    const body = parseFetchBody(mock)
    expect(body.type).toBe("interactive")
    expect(body.interactive.type).toBe("order_status")
    expect(body.interactive.body).toEqual({ text: "Pagamento confirmado!" })
    expect(body.interactive.action.name).toBe("review_order")
    expect(body.interactive.action.parameters.reference_id).toBe("order_123")
    expect(body.interactive.action.parameters.order.status).toBe("completed")
    expect(body.interactive.action.parameters.order.description).toBe("PIX recebido")
  })

  it("should send order status failed", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderStatus("5511999999999", "Pagamento falhou", {
      referenceId: "order_456",
      order: { status: "failed", description: "PIX expirado" },
    })

    const body = parseFetchBody(mock)
    expect(body.interactive.action.parameters.order.status).toBe("failed")
  })

  it("should send order status without description", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderStatus("5511999999999", "Status atualizado", {
      referenceId: "order_789",
      order: { status: "processing" },
    })

    const body = parseFetchBody(mock)
    expect(body.interactive.action.parameters.order.description).toBeUndefined()
  })

  it("should send order status shipped and canceled", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderStatus("5511999999999", "Saiu para entrega", {
      referenceId: "order_ship",
      order: { status: "shipped" },
    })

    await client.sendOrderStatus("5511999999999", "Pedido cancelado", {
      referenceId: "order_cancel",
      order: { status: "canceled" },
    })

    const shippedBody = JSON.parse(mock.mock.calls[0][1].body)
    const canceledBody = JSON.parse(mock.mock.calls[1][1].body)
    expect(shippedBody.interactive.action.parameters.order.status).toBe("shipped")
    expect(canceledBody.interactive.action.parameters.order.status).toBe("canceled")
  })

  it("should send order status with header and footer", async () => {
    const mock = mockFetch(SUCCESS)
    const client = createClient()

    await client.sendOrderStatus("5511999999999", "Pedido confirmado", {
      referenceId: "order_hf",
      order: { status: "completed" },
    }, { header: "Status", footer: "Obrigado!" })

    const body = parseFetchBody(mock)
    expect(body.interactive.header).toEqual({ type: "text", text: "Status" })
    expect(body.interactive.footer).toEqual({ text: "Obrigado!" })
  })
})
