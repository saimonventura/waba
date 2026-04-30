import { describe, it, expect, vi, beforeEach } from "vitest"
import { WhatsApp } from "../src/client.js"
import { ValidationError } from "../src/validate.js"
import { WhatsAppError } from "../src/errors.js"

const PHONE_ID = "123456789"
const TOKEN = "test-token"
const WABA_ID = "WABA_123"
const BM_ID = "BM_999"
const CATALOG_ID = "CAT_111"
const PRODUCT_ID = "PROD_222"
const API_VERSION = "v25.0"
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

function createClient() {
  return new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID })
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

function parseFetchUrl(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][0]
}

function parseFetchBody(mock: ReturnType<typeof vi.fn>): any {
  const call = mock.mock.calls[0]
  const body = call[1]?.body
  if (typeof body === "string") return JSON.parse(body)
  return body
}

function parseFetchFormBody(mock: ReturnType<typeof vi.fn>): URLSearchParams {
  const body = mock.mock.calls[0][1]?.body
  if (!(body instanceof URLSearchParams)) throw new Error("expected URLSearchParams body")
  return body
}

function parseFetchMethod(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][1]?.method ?? "POST"
}

function parseFetchHeaders(mock: ReturnType<typeof vi.fn>): Record<string, string> {
  return mock.mock.calls[0][1]?.headers ?? {}
}

describe("Catalog & Product Management", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ── Catalogs (BM-level) ──

  it("should list owned product catalogs of a BM", async () => {
    const response = { data: [{ id: CATALOG_ID, name: "My Catalog", vertical: "commerce", product_count: 0 }] }
    const mock = mockFetch(response)
    const client = createClient()

    const result = await client.listOwnedCatalogs(BM_ID)

    expect(parseFetchUrl(mock)).toContain(`${BASE_URL}/${BM_ID}/owned_product_catalogs`)
    expect(parseFetchMethod(mock)).toBe("GET")
    expect(result).toEqual(response)
  })

  it("should list owned catalogs with custom fields", async () => {
    const mock = mockFetch({ data: [] })
    const client = createClient()

    await client.listOwnedCatalogs(BM_ID, { fields: ["id", "name", "product_count"] })

    const url = parseFetchUrl(mock)
    expect(url).toContain("fields=id%2Cname%2Cproduct_count")
  })

  it("should list client-shared catalogs of a BM", async () => {
    const response = { data: [{ id: CATALOG_ID, name: "Shared Catalog", vertical: "commerce" }] }
    const mock = mockFetch(response)
    const client = createClient()

    await client.listClientCatalogs(BM_ID)

    expect(parseFetchUrl(mock)).toContain(`${BASE_URL}/${BM_ID}/client_product_catalogs`)
    expect(parseFetchMethod(mock)).toBe("GET")
  })

  it("should create a catalog under a BM", async () => {
    const response = { id: CATALOG_ID }
    const mock = mockFetch(response)
    const client = createClient()

    const result = await client.createCatalog(BM_ID, { name: "ZapZap Triptem", vertical: "commerce" })

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${BM_ID}/owned_product_catalogs`)
    expect(parseFetchMethod(mock)).toBe("POST")
    expect(parseFetchBody(mock)).toEqual({ name: "ZapZap Triptem", vertical: "commerce" })
    expect(result).toEqual(response)
  })

  it("should get catalog details with custom fields", async () => {
    const response = { id: CATALOG_ID, name: "My Catalog", product_count: 42 }
    const mock = mockFetch(response)
    const client = createClient()

    const result = await client.getCatalog(CATALOG_ID, ["id", "name", "product_count"])

    const url = parseFetchUrl(mock)
    expect(url).toContain(`${BASE_URL}/${CATALOG_ID}`)
    expect(url).toContain("fields=id%2Cname%2Cproduct_count")
    expect(parseFetchMethod(mock)).toBe("GET")
    expect(result).toEqual(response)
  })

  it("should delete a catalog", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.deleteCatalog(CATALOG_ID)

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${CATALOG_ID}`)
    expect(parseFetchMethod(mock)).toBe("DELETE")
  })

  // ── Products (catalog-level CRUD) ──

  it("should create a product in a catalog", async () => {
    const response = { id: PRODUCT_ID }
    const mock = mockFetch(response)
    const client = createClient()

    const result = await client.createProduct(CATALOG_ID, {
      retailer_id: "sku-001",
      name: "Abridor Inox",
      description: "Abridor combinado total inox encartelado",
      image_url: "https://cdn.example.com/abridor.jpg",
      price: 690,
      currency: "BRL",
      availability: "in stock",
      condition: "new",
      url: "https://loja.example.com/abridor",
    })

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${CATALOG_ID}/products`)
    expect(parseFetchMethod(mock)).toBe("POST")
    const body = parseFetchBody(mock)
    expect(body.retailer_id).toBe("sku-001")
    expect(body.price).toBe(690)
    expect(body.currency).toBe("BRL")
    expect(result).toEqual(response)
  })

  it("should get product details", async () => {
    const response = { id: PRODUCT_ID, retailer_id: "sku-001", name: "Abridor", price: 690, currency: "BRL" }
    const mock = mockFetch(response)
    const client = createClient()

    await client.getProduct(PRODUCT_ID, ["id", "retailer_id", "name", "price", "currency"])

    const url = parseFetchUrl(mock)
    expect(url).toContain(`${BASE_URL}/${PRODUCT_ID}`)
    expect(url).toContain("fields=id%2Cretailer_id%2Cname%2Cprice%2Ccurrency")
    expect(parseFetchMethod(mock)).toBe("GET")
  })

  it("should update product fields (partial)", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.updateProduct(PRODUCT_ID, { price: 590, availability: "out of stock" })

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PRODUCT_ID}`)
    expect(parseFetchMethod(mock)).toBe("POST")
    expect(parseFetchBody(mock)).toEqual({ price: 590, availability: "out of stock" })
  })

  it("should delete a product", async () => {
    const mock = mockFetch({ success: true })
    const client = createClient()

    await client.deleteProduct(PRODUCT_ID)

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${PRODUCT_ID}`)
    expect(parseFetchMethod(mock)).toBe("DELETE")
  })

  it("should list products with paging cursor", async () => {
    const response = {
      data: [{ id: "p1", retailer_id: "sku-001", name: "Item 1" }],
      paging: { cursors: { after: "next-cursor" } },
    }
    const mock = mockFetch(response)
    const client = createClient()

    const result = await client.listProducts(CATALOG_ID, { limit: 50, after: "prev-cursor", fields: ["id", "retailer_id", "name"] })

    const url = parseFetchUrl(mock)
    expect(url).toContain(`${BASE_URL}/${CATALOG_ID}/products`)
    expect(url).toContain("limit=50")
    expect(url).toContain("after=prev-cursor")
    expect(url).toContain("fields=id%2Cretailer_id%2Cname")
    expect(parseFetchMethod(mock)).toBe("GET")
    expect(result).toEqual(response)
  })

  // ── Batch ──

  it("should batch create products and return handles", async () => {
    const response = { handles: ["batch-handle-abc"] }
    const mock = mockFetch(response)
    const client = createClient()

    const requests = [
      {
        method: "CREATE" as const,
        retailer_id: "sku-001",
        data: {
          retailer_id: "sku-001",
          name: "Abridor",
          description: "x",
          image_url: "https://cdn.example.com/1.jpg",
          price: 690,
          currency: "BRL",
          url: "https://shop.example.com/abridor",
        },
      },
      {
        method: "UPDATE" as const,
        retailer_id: "sku-002",
        data: { price: 1990 },
      },
      {
        method: "DELETE" as const,
        retailer_id: "sku-003",
      },
    ]

    const result = await client.batchProducts(CATALOG_ID, requests)

    expect(parseFetchUrl(mock)).toBe(`${BASE_URL}/${CATALOG_ID}/batch`)
    expect(parseFetchMethod(mock)).toBe("POST")
    const body = parseFetchFormBody(mock)
    expect(JSON.parse(body.get("requests") ?? "")).toEqual(requests)
    expect(result).toEqual(response)
  })

  it("should reject batch with zero requests", async () => {
    mockFetch({ handles: [] })
    const client = createClient()

    await expect(client.batchProducts(CATALOG_ID, [])).rejects.toThrow(/at least 1/i)
  })

  it("should reject batch with more than 5000 requests", async () => {
    mockFetch({ handles: [] })
    const client = createClient()

    const huge = Array.from({ length: 5001 }, (_, i) => ({
      method: "DELETE" as const,
      retailer_id: `sku-${i}`,
    }))

    await expect(client.batchProducts(CATALOG_ID, huge)).rejects.toThrow(/5000/)
  })

  it("should support allow_upsert option in batch", async () => {
    const mock = mockFetch({ handles: ["h1"] })
    const client = createClient()

    await client.batchProducts(
      CATALOG_ID,
      [{ method: "UPDATE", retailer_id: "sku-001", data: { price: 990 } }],
      { allowUpsert: true },
    )

    const body = parseFetchFormBody(mock)
    expect(body.get("allow_upsert")).toBe("true")
  })

  it("should get batch status by handle (unwraps data array)", async () => {
    const status = { handle: "batch-handle-abc", status: "finished", errors_total_count: 0, errors: [], warnings: [] }
    const mock = mockFetch({ data: [status] })
    const client = createClient()

    const result = await client.getBatchStatus(CATALOG_ID, "batch-handle-abc")

    const url = parseFetchUrl(mock)
    expect(url).toContain(`${BASE_URL}/${CATALOG_ID}/check_batch_request_status`)
    expect(url).toContain("handle=batch-handle-abc")
    expect(parseFetchMethod(mock)).toBe("GET")
    expect(result).toEqual(status)
  })

  // ── Validation (gated by validate flag) ──

  it("should reject createProduct with empty retailer_id (always — structural)", async () => {
    mockFetch({ id: PRODUCT_ID })
    const client = createClient()

    await expect(client.createProduct(CATALOG_ID, {
      retailer_id: "",
      name: "X",
      description: "x",
      image_url: "https://x.com/i.jpg",
      price: 100,
      currency: "BRL",
      url: "https://shop.example.com",
    })).rejects.toThrow(/retailer_id/)
  })

  it("should reject createProduct with empty retailer_id even when validate: true (structural runs in both)", async () => {
    mockFetch({ id: PRODUCT_ID })
    const client = new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID, validate: true })

    await expect(client.createProduct(CATALOG_ID, {
      retailer_id: "",
      name: "X",
      description: "x",
      image_url: "https://x.com/i.jpg",
      price: 100,
      currency: "BRL",
      url: "https://shop.example.com",
    })).rejects.toThrow(/retailer_id/)
  })

  it("should reject createProduct with empty image_url (always — structural)", async () => {
    mockFetch({ id: PRODUCT_ID })
    const client = createClient()

    await expect(client.createProduct(CATALOG_ID, {
      retailer_id: "sku-001",
      name: "X",
      description: "x",
      image_url: "",
      price: 100,
      currency: "BRL",
      url: "https://shop.example.com",
    })).rejects.toThrow(/image_url/)
  })

  it("should reject createProduct with empty url (always — structural, Meta requires it)", async () => {
    mockFetch({ id: PRODUCT_ID })
    const client = createClient()

    await expect(client.createProduct(CATALOG_ID, {
      retailer_id: "sku-001",
      name: "X",
      description: "x",
      image_url: "https://x.com/i.jpg",
      price: 100,
      currency: "BRL",
      url: "",
    })).rejects.toThrow(/url/)
  })

  it("should reject createProduct with negative price (validate: true)", async () => {
    mockFetch({ id: PRODUCT_ID })
    const client = new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID, validate: true })

    await expect(client.createProduct(CATALOG_ID, {
      retailer_id: "sku-001",
      name: "X",
      description: "x",
      image_url: "https://x.com/i.jpg",
      price: -10,
      currency: "BRL",
      url: "https://shop.example.com",
    })).rejects.toThrow(/price/)
  })

  it("should reject createProduct with non-ISO currency (validate: true)", async () => {
    mockFetch({ id: PRODUCT_ID })
    const client = new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID, validate: true })

    await expect(client.createProduct(CATALOG_ID, {
      retailer_id: "sku-001",
      name: "X",
      description: "x",
      image_url: "https://x.com/i.jpg",
      price: 100,
      currency: "brl",
      url: "https://shop.example.com",
    })).rejects.toThrow(/currency/)
  })

  it("should skip soft-limit validation when validate flag is off", async () => {
    mockFetch({ id: PRODUCT_ID })
    const client = createClient()

    await expect(client.createProduct(CATALOG_ID, {
      retailer_id: "sku-001",
      name: "X",
      description: "x",
      image_url: "https://x.com/i.jpg",
      price: -10,
      currency: "brl",
      url: "https://shop.example.com",
    })).resolves.toBeDefined()
  })

  // ── ValidationError instance ──

  it("should throw ValidationError instance (not raw Error) on validation failure", async () => {
    mockFetch({ id: PRODUCT_ID })
    const client = createClient()

    await expect(client.createProduct(CATALOG_ID, {
      retailer_id: "",
      name: "X",
      description: "x",
      image_url: "https://x.com/i.jpg",
      price: 100,
      currency: "BRL",
      url: "https://shop.example.com",
    })).rejects.toBeInstanceOf(ValidationError)
  })

  // ── updateProduct (validateProductPatch) coverage ──

  it("should reject updateProduct with negative price (validate: true)", async () => {
    mockFetch({ success: true })
    const client = new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID, validate: true })

    await expect(client.updateProduct(PRODUCT_ID, { price: -50 })).rejects.toThrow(/price/)
  })

  it("should reject updateProduct with non-ISO currency (validate: true)", async () => {
    mockFetch({ success: true })
    const client = new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID, validate: true })

    await expect(client.updateProduct(PRODUCT_ID, { currency: "USDX" })).rejects.toThrow(/currency/)
  })

  it("should reject updateProduct with non-http image_url (validate: true)", async () => {
    mockFetch({ success: true })
    const client = new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID, validate: true })

    await expect(client.updateProduct(PRODUCT_ID, { image_url: "ftp://x.com/i.jpg" })).rejects.toThrow(/image_url/)
  })

  it("should reject updateProduct with non-http url (validate: true)", async () => {
    mockFetch({ success: true })
    const client = new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID, validate: true })

    await expect(client.updateProduct(PRODUCT_ID, { url: "ftp://x.com/page" })).rejects.toThrow(/url/)
  })

  it("should pass updateProduct with name only (validate: true, no-op for unrelated fields)", async () => {
    mockFetch({ success: true })
    const client = new WhatsApp({ phoneNumberId: PHONE_ID, accessToken: TOKEN, wabaId: WABA_ID, validate: true })

    await expect(client.updateProduct(PRODUCT_ID, { name: "Renamed" })).resolves.toBeDefined()
  })

  // ── batchProducts: validation_status surface ──

  it("should throw WhatsAppError when batch returns validation_status (no handles)", async () => {
    mockFetch({
      validation_status: [
        { retailer_id: "sku-001", errors: [{ message: "invalid image_url" }] },
      ],
    })
    const client = createClient()

    await expect(client.batchProducts(CATALOG_ID, [
      { method: "CREATE", retailer_id: "sku-001", data: {
        retailer_id: "sku-001", name: "x", description: "x",
        image_url: "https://x.com/i.jpg", price: 100, currency: "BRL", url: "https://x.com",
      }},
    ])).rejects.toBeInstanceOf(WhatsAppError)
  })

  it("should NOT throw when batch returns handles even alongside empty validation_status", async () => {
    const response = { handles: ["h1"], validation_status: [{ retailer_id: "sku-001", errors: [] }] }
    mockFetch(response)
    const client = createClient()

    const result = await client.batchProducts(CATALOG_ID, [
      { method: "DELETE", retailer_id: "sku-001" },
    ])
    expect(result).toEqual(response)
  })

  it("should throw WhatsAppError when batch returns no handles even without errors populated", async () => {
    // Meta has been observed to return validation_status entries with no errors key
    // or an empty errors array — absence of handles is the authoritative failure signal.
    mockFetch({ validation_status: [{ retailer_id: "sku-001" }] })
    const client = createClient()

    await expect(client.batchProducts(CATALOG_ID, [
      { method: "DELETE", retailer_id: "sku-001" },
    ])).rejects.toBeInstanceOf(WhatsAppError)
  })

  it("should throw WhatsAppError when batch returns empty body (no handles, no validation_status)", async () => {
    mockFetch({})
    const client = createClient()

    await expect(client.batchProducts(CATALOG_ID, [
      { method: "DELETE", retailer_id: "sku-001" },
    ])).rejects.toBeInstanceOf(WhatsAppError)
  })

  it("should classify batch_validation_failed as parameter/fix_and_retry", async () => {
    mockFetch({ validation_status: [{ retailer_id: "sku-001", errors: [{ message: "bad image" }] }] })
    const client = createClient()

    const promise = client.batchProducts(CATALOG_ID, [
      { method: "DELETE", retailer_id: "sku-001" },
    ])

    await promise.catch((e: WhatsAppError) => {
      expect(e.title).toBe("batch_validation_failed")
      expect(e.category).toBe("parameter")
      expect(e.retryHint).toBe("fix_and_retry")
    })
  })

  it("should classify empty_batch_status as parameter/do_not_retry", async () => {
    mockFetch({ data: [] })
    const client = createClient()

    const promise = client.getBatchStatus(CATALOG_ID, "stale-handle")

    await promise.catch((e: WhatsAppError) => {
      expect(e.title).toBe("empty_batch_status")
      expect(e.category).toBe("parameter")
      expect(e.retryHint).toBe("do_not_retry")
    })
  })

  // ── getBatchStatus: empty data handling ──

  it("should throw WhatsAppError when getBatchStatus returns empty data", async () => {
    mockFetch({ data: [] })
    const client = createClient()

    await expect(client.getBatchStatus(CATALOG_ID, "unknown-handle")).rejects.toBeInstanceOf(WhatsAppError)
  })

  it("should throw WhatsAppError when getBatchStatus returns no data field", async () => {
    mockFetch({})
    const client = createClient()

    await expect(client.getBatchStatus(CATALOG_ID, "stale-handle")).rejects.toBeInstanceOf(WhatsAppError)
  })

  // ── URLSearchParams body sets correct Content-Type ──

  it("should set Content-Type: application/x-www-form-urlencoded for batch (URLSearchParams body)", async () => {
    const mock = mockFetch({ handles: ["h1"] })
    const client = createClient()

    await client.batchProducts(CATALOG_ID, [
      { method: "DELETE", retailer_id: "sku-001" },
    ])

    expect(parseFetchHeaders(mock)["Content-Type"]).toBe("application/x-www-form-urlencoded")
  })

  // ── listProducts paging + filter coverage ──

  it("should support `before` cursor in listProducts paging", async () => {
    const mock = mockFetch({ data: [], paging: { cursors: { before: "older" } } })
    const client = createClient()

    await client.listProducts(CATALOG_ID, { before: "older-cursor" })

    expect(parseFetchUrl(mock)).toContain("before=older-cursor")
  })

  it("should JSON-encode filter param in listProducts", async () => {
    const mock = mockFetch({ data: [] })
    const client = createClient()

    await client.listProducts(CATALOG_ID, { filter: { availability: { eq: "in stock" } } })

    const url = parseFetchUrl(mock)
    expect(url).toContain("filter=")
    const params = new URL(url).searchParams
    const filter = params.get("filter")
    expect(filter).not.toBeNull()
    expect(JSON.parse(filter!)).toEqual({ availability: { eq: "in stock" } })
  })

  it("should omit fields query param when fields array is empty", async () => {
    const mock = mockFetch({ data: [] })
    const client = createClient()

    await client.listOwnedCatalogs(BM_ID, { fields: [] })

    const url = parseFetchUrl(mock)
    expect(url).not.toContain("fields=")
  })

  it("should NOT set allow_upsert in batch body when option is omitted", async () => {
    const mock = mockFetch({ handles: ["h1"] })
    const client = createClient()

    await client.batchProducts(CATALOG_ID, [
      { method: "DELETE", retailer_id: "sku-001" },
    ])

    const body = parseFetchFormBody(mock)
    expect(body.get("allow_upsert")).toBeNull()
  })
})
