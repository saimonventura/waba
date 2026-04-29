# @saimonventura/waba

[![npm](https://img.shields.io/npm/v/@saimonventura/waba)](https://www.npmjs.com/package/@saimonventura/waba) [![downloads](https://img.shields.io/npm/dm/@saimonventura/waba)](https://www.npmjs.com/package/@saimonventura/waba) [![license](https://img.shields.io/npm/l/@saimonventura/waba)](LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![tests](https://img.shields.io/badge/tests-202%20passing-brightgreen)]() [![zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)]() [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**The complete WhatsApp Cloud API SDK for TypeScript.** Zero dependencies. 83 methods. Every API surface covered.

```ts
import { WhatsApp } from "@saimonventura/waba"

const wa = new WhatsApp({
  phoneNumberId: "YOUR_PHONE_NUMBER_ID",
  accessToken: "YOUR_ACCESS_TOKEN",
})

await wa.sendText("5511999999999", "Hello from waba!")
```

## Why waba?

| | **waba** | whatsapp-api-js | @kapso/whatsapp-cloud-api |
|---|:---:|:---:|:---:|
| **API methods** | 83 | ~30 | ~25 |
| **Dependencies** | 0 | 1+ | 5+ (Zod, etc.) |
| **Flows API** | 9 methods | - | - |
| **Analytics API** | 3 methods | - | - |
| **QR Codes API** | 4 methods | - | - |
| **Commerce API** | Full | Partial | - |
| **Broadcast** | Built-in (batched) | - | - |
| **Webhook parsing** | Typed + HMAC | Typed | Basic |
| **Bundle size** | ~15KB | ~50KB | ~80KB |
| **TypeScript** | Strict, 49 interfaces | Yes | Yes |
| **Runtime** | Node 18+, Bun, Deno | Node | Node |

**waba** uses only native `fetch` and `FormData` — no polyfills, no bloat, works everywhere.

## Install

```bash
npm install @saimonventura/waba
# or
pnpm add @saimonventura/waba
# or
bun add @saimonventura/waba
```

## Quick Start

```ts
import { WhatsApp } from "@saimonventura/waba"

const wa = new WhatsApp({
  phoneNumberId: "YOUR_PHONE_NUMBER_ID",
  accessToken: "YOUR_ACCESS_TOKEN",
  wabaId: "YOUR_WABA_ID",   // needed for templates, analytics, flows
  apiVersion: "v25.0",      // optional, defaults to v25.0
})
```

## Messaging

### Text

```ts
await wa.sendText(to, "Hello!")
await wa.sendText(to, "Check this: https://example.com", { previewUrl: true })
await wa.sendText(to, "Replying", { replyTo: "wamid.xxx" })
```

### Media

```ts
await wa.sendImage(to, { url: "https://example.com/photo.jpg" }, "Caption")
await wa.sendVideo(to, { url: "https://example.com/video.mp4" }, "My video")
await wa.sendDocument(to, { url: "https://example.com/file.pdf" }, "invoice.pdf", "Your invoice")
await wa.sendAudio(to, { id: "media_id_from_upload" })
await wa.sendSticker(to, { url: "https://example.com/sticker.webp" })
```

### Location & Contacts

```ts
await wa.sendLocation(to, { lat: -23.55, lng: -46.63, name: "Office", address: "Sao Paulo" })

await wa.sendContacts(to, [{
  name: { formatted_name: "Jane Doe" },
  phones: [{ phone: "+5511999999999" }],
}])
```

### Reactions

```ts
await wa.sendReaction(to, "wamid.xxx", "\u{1f44d}")
await wa.removeReaction(to, "wamid.xxx")
```

## Interactive Messages

### Buttons (up to 3)

```ts
await wa.sendButtons(to, "Choose an option:", [
  { id: "yes", title: "Yes" },
  { id: "no", title: "No" },
], { header: "Confirm", footer: "Tap a button" })
```

### List Menu

```ts
await wa.sendList(to, "Our menu:", "View options", [
  {
    title: "Burgers",
    rows: [
      { id: "classic", title: "Classic Burger", description: "$9.90" },
      { id: "cheese", title: "Cheeseburger", description: "$11.90" },
    ],
  },
])
```

### CTA URL

```ts
await wa.sendCTA(to, "Visit our website", { text: "Open", url: "https://example.com" })
```

### Product & Catalog

```ts
await wa.sendProduct(to, "CATALOG_ID", "PRODUCT_ID", "Check this out")
await wa.sendProductList(to, "Our Products", "Browse our catalog", "CATALOG_ID", sections)
await wa.sendCatalog(to, "See everything we have!", { thumbnailProductId: "PRODUCT_ID" })
```

### Location Request

```ts
await wa.sendLocationRequest(to, "Please share your delivery address")
```

### Flows

```ts
await wa.sendFlow(to, "Complete your order", {
  flowId: "FLOW_ID",
  flowCta: "Start",
  mode: "published",
})
```

## Payments (Brazil & India)

Send payment requests via PIX (Brazil) or UPI (India):

### Order Details

```ts
await wa.sendOrderDetails(to, "Your order summary", {
  referenceId: "order_123",
  paymentType: "br",                    // "br" for PIX, "upi" for India
  paymentConfiguration: "CONFIG_ID",     // from Meta Business Manager
  currency: "BRL",
  totalAmount: { value: 2990, offset: 100 },  // R$ 29.90
  order: {
    status: "pending",
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
}, { header: "Your Order", footer: "Pay with PIX" })
```

### Order Status

```ts
await wa.sendOrderStatus(to, "Payment confirmed!", {
  referenceId: "order_123",
  order: { status: "completed", description: "PIX received" },
})
```

## Templates

```ts
// Send
await wa.sendTemplate(to, "hello_world", "en_US")

// With parameters
await wa.sendTemplate(to, "order_update", "pt_BR", [
  { type: "body", parameters: [{ type: "text", text: "Order #123" }] },
])

// CRUD (requires wabaId)
const templates = await wa.listTemplates({ status: "APPROVED" })
await wa.createTemplate({ name: "my_template", language: "pt_BR", category: "UTILITY", components: [] })
await wa.deleteTemplate("my_template")
```

### Creating templates (typed builders)

Avoid hand-crafting `components` arrays. Two helpers cover most marketing/utility cases:

```ts
// Standard template — header + body + footer + buttons
await wa.createStandardTemplate({
  name: "order_shipped",
  language: "pt_BR",
  category: "UTILITY",
  header: { type: "text", text: "Pedido enviado, {{1}}!", example: "Pablo" },
  body: { text: "Seu pedido {{1}} chega em {{2}}.", example: ["#1234", "3 dias"] },
  footer: "Triptem © 2026",
  buttons: [
    { type: "url", text: "Rastrear", url: "https://triptem.com/order/{{1}}", example: "1234" },
    { type: "phone_number", text: "Ligar", phone_number: "+5511999999999" },
  ],
})

// Carousel template — 2 to 10 product cards (uploaded handles via uploadMediaResumable)
await wa.createCarouselTemplate({
  name: "promo_v1",
  language: "pt_BR",
  body: { text: "Confira nossas ofertas! 🛒" },
  cards: [
    {
      header: { format: "image", handle: handle1 },
      body: { text: "Produto A\n*R$ 9,90*" },
      buttons: [{ type: "url", text: "Comprar", url: "https://shop.example.com" }],
    },
    {
      header: { format: "image", handle: handle2 },
      body: { text: "Produto B\n*R$ 19,90*" },
      buttons: [{ type: "url", text: "Comprar", url: "https://shop.example.com" }],
    },
  ],
})
```

Both helpers validate invariants before submitting (carousel: 2–10 cards, all cards must share the same component structure; standard: body required, char limits enforced) and throw a descriptive `Error` on violation.

## Broadcast

Send templates to thousands of recipients with automatic batching and rate limiting:

```ts
const result = await wa.broadcastTemplate(
  ["5511999999999", "5511888888888", /* ...thousands more */],
  "promo_campaign",
  "pt_BR",
  [{ type: "body", parameters: [{ type: "text", text: "20% OFF" }] }],
  { batchSize: 50, delayMs: 100 },
)

console.log(`Sent: ${result.succeeded.length}, Failed: ${result.failed.length}`)
```

## Media Management

```ts
const { id } = await wa.uploadMedia(fileBytes, "image/jpeg")
const { url } = await wa.getMediaUrl(id)
const bytes = await wa.downloadMedia(url)
await wa.deleteMedia(id)
```

## Webhooks

### With Express

```ts
import express from "express"
import { WhatsApp } from "@saimonventura/waba"

const app = express()

// Verification (GET)
app.get("/webhook", (req, res) => {
  try {
    const challenge = WhatsApp.verifyWebhook(req.query, "YOUR_VERIFY_TOKEN")
    res.send(challenge)
  } catch {
    res.sendStatus(403)
  }
})

// Receive events (POST)
app.post("/webhook", express.json(), (req, res) => {
  const events = WhatsApp.parseWebhook(req.body)

  for (const event of events) {
    if (event.type === "message") {
      console.log(`${event.contact.profile.name}: ${event.message.type}`)
    }
    if (event.type === "status") {
      console.log(`Message ${event.status.id}: ${event.status.status}`)
    }
  }

  res.sendStatus(200)
})
```

### With Hono

```ts
import { Hono } from "hono"
import { WhatsApp } from "@saimonventura/waba"

const app = new Hono()

app.get("/webhook", (c) => {
  try {
    const challenge = WhatsApp.verifyWebhook(c.req.query(), "YOUR_VERIFY_TOKEN")
    return c.text(challenge)
  } catch {
    return c.text("Forbidden", 403)
  }
})

app.post("/webhook", async (c) => {
  const events = WhatsApp.parseWebhook(await c.req.json())

  for (const event of events) {
    if (event.type === "message") {
      console.log(`${event.contact.profile.name}: ${event.message.type}`)
    }
  }

  return c.text("OK")
})
```

### HMAC Signature Verification

Always verify signatures in production:

```ts
// Verify + parse in one step
const events = WhatsApp.parseWebhookWithSignature(rawBody, req.headers["x-hub-signature-256"], APP_SECRET)

// Or verify separately
const isValid = WhatsApp.validateSignature(rawBody, signature, APP_SECRET)
```

## Flows Management

Full CRUD for WhatsApp Flows:

```ts
const { id } = await wa.createFlow("Order Flow", ["OTHER"])
await wa.updateFlowJSON(id, JSON.stringify(flowDefinition))
await wa.publishFlow(id)

const flows = await wa.listFlows()
const flow = await wa.getFlow(id)
const assets = await wa.getFlowAssets(id)

await wa.deprecateFlow(id)
await wa.deleteFlow(id)
```

## QR Codes

```ts
const qr = await wa.createQR("Hello! How can I help?", "png")
console.log(qr.qr_image_url)  // direct link to QR image
console.log(qr.deep_link_url) // wa.me deep link

const { data: codes } = await wa.listQRCodes()
await wa.updateQR(codes[0].code, "Updated message")
await wa.deleteQR(codes[0].code)
```

## Analytics

```ts
const now = Math.floor(Date.now() / 1000)
const thirtyDaysAgo = now - 86400 * 30

const analytics = await wa.getAnalytics(thirtyDaysAgo, now, "DAY")
const conversations = await wa.getConversationAnalytics(thirtyDaysAgo, now, "DAILY")
const templateStats = await wa.getTemplateAnalytics(thirtyDaysAgo, now, ["TEMPLATE_ID"])
```

## Business Profile & Phone

```ts
const profile = await wa.getBusinessProfile()
await wa.updateBusinessProfile({ about: "We deliver great products" })

const info = await wa.getPhoneInfo()
const { data: numbers } = await wa.listPhoneNumbers()
const health = await wa.getHealthStatus()
```

## Error Handling

All API errors throw `WhatsAppError` with Meta's error codes:

```ts
import { WhatsAppError } from "@saimonventura/waba"

try {
  await wa.sendText(to, "Hello")
} catch (err) {
  if (err instanceof WhatsAppError) {
    console.log(err.code)       // Meta error code (e.g. 131030)
    console.log(err.httpStatus) // HTTP status (e.g. 400, 429)
    console.log(err.message)    // Human-readable message
    console.log(err.details)    // fbtrace_id for Meta support
  }
}
```

## TypeScript

All 49 interfaces are exported:

```ts
import type {
  WhatsAppConfig, SendMessageOptions, SendMessageResult,
  MediaSource, Button, ListSection, CTAAction,
  LocationData, ContactData, FlowAction,
  TemplateComponent, TemplateCreateRequest,
  MediaUploadResult, MediaUrlResult,
  BusinessProfile, PhoneInfo, CommerceSettings,
  HealthStatusResponse, PhoneNumberEntry, QRCode, FlowInfo,
  WebhookEvent, InboundMessage, StatusUpdate, BroadcastResult,
} from "@saimonventura/waba"
```

## All 83 Methods

| Category | Methods |
|---|---|
| **Messaging** | `sendText` `sendImage` `sendAudio` `sendVideo` `sendDocument` `sendSticker` `sendLocation` `sendContacts` |
| **Reactions** | `sendReaction` `removeReaction` |
| **Interactive** | `sendButtons` `sendList` `sendCTA` `sendProduct` `sendProductList` `sendCatalog` `sendLocationRequest` `sendAddressMessage` `sendFlow` `sendVoiceCall` `sendOrderDetails` `sendOrderStatus` |
| **Status** | `markAsRead` `sendTypingIndicator` |
| **Templates** | `sendTemplate` `sendCarouselTemplate` `sendAuthTemplate` `sendCouponTemplate` `listTemplates` `getTemplate` `createTemplate` `createStandardTemplate` `createCarouselTemplate` `updateTemplate` `deleteTemplate` |
| **Media** | `uploadMedia` `uploadMediaResumable` `getMediaUrl` `downloadMedia` `deleteMedia` |
| **Business Profile** | `getBusinessProfile` `updateBusinessProfile` |
| **Phone** | `getPhoneInfo` `registerPhone` `deregisterPhone` `requestVerificationCode` `verifyCode` |
| **Two-Step** | `setTwoStepPin` `removeTwoStepPin` |
| **Block** | `blockUser` `unblockUser` |
| **Commerce** | `getCommerceSettings` `updateCommerceSettings` |
| **Health** | `getHealthStatus` |
| **Phone Numbers** | `listPhoneNumbers` |
| **QR Codes** | `createQR` `listQRCodes` `updateQR` `deleteQR` |
| **Flows** | `createFlow` `listFlows` `getFlow` `updateFlow` `publishFlow` `deprecateFlow` `deleteFlow` `getFlowAssets` `updateFlowJSON` |
| **Analytics** | `getAnalytics` `getConversationAnalytics` `getTemplateAnalytics` `getTemplatePerformance` `getPricingAnalytics` `getCallAnalytics` |
| **Calling** | `initiateCall` `acceptCall` `rejectCall` `terminateCall` |
| **Broadcast** | `broadcastTemplate` |
| **Webhooks** | `verifyWebhook` `parseWebhook` `validateSignature` `parseWebhookWithSignature` |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
