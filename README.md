# @saimonventura/waba

[![npm](https://img.shields.io/npm/v/@saimonventura/waba)](https://www.npmjs.com/package/@saimonventura/waba) [![license](https://img.shields.io/npm/l/@saimonventura/waba)](LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![tests](https://img.shields.io/badge/tests-101%20passing-brightgreen)]() [![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)]()

**WhatsApp Cloud API SDK for TypeScript**

- **Zero dependencies** — uses native `fetch` and `FormData`
- **Full Cloud API v25.0** — 62 methods covering messaging, templates, media, webhooks, flows, analytics, and more
- **101 tests** — comprehensive coverage across all API surfaces
- **TypeScript-first** — strict types, 49 exported interfaces
- **Runtime-agnostic** — Node.js 18+, Bun, Deno

## Quick Start

```ts
import { WhatsApp } from "@saimonventura/waba"

const wa = new WhatsApp({
  phoneNumberId: "YOUR_PHONE_NUMBER_ID",
  accessToken: "YOUR_ACCESS_TOKEN",
})

await wa.sendText("5511999999999", "Hello from waba!")
```

## Install

```bash
npm install @saimonventura/waba
```

## API Overview

62 methods covering the entire WhatsApp Cloud API.

| Category | Methods |
|---|---|
| **Messaging** | `sendText` `sendImage` `sendAudio` `sendVideo` `sendDocument` `sendSticker` `sendLocation` `sendContacts` |
| **Reactions** | `sendReaction` `removeReaction` |
| **Interactive** | `sendButtons` `sendList` `sendCTA` `sendProduct` `sendProductList` `sendCatalog` `sendLocationRequest` `sendAddressMessage` `sendFlow` `sendVoiceCall` |
| **Status** | `markAsRead` `sendTypingIndicator` |
| **Templates** | `sendTemplate` `listTemplates` `createTemplate` `deleteTemplate` |
| **Media** | `uploadMedia` `getMediaUrl` `downloadMedia` `deleteMedia` |
| **Business Profile** | `getBusinessProfile` `updateBusinessProfile` |
| **Phone** | `getPhoneInfo` `registerPhone` `deregisterPhone` `requestVerificationCode` `verifyCode` |
| **Two-Step Verification** | `setTwoStepPin` `removeTwoStepPin` |
| **Block / Unblock** | `blockUser` `unblockUser` |
| **Commerce** | `getCommerceSettings` `updateCommerceSettings` |
| **Health** | `getHealthStatus` |
| **Phone Numbers** | `listPhoneNumbers` |
| **QR Codes** | `createQR` `listQRCodes` `updateQR` `deleteQR` |
| **Flows** | `createFlow` `listFlows` `getFlow` `updateFlow` `publishFlow` `deprecateFlow` `deleteFlow` `getFlowAssets` `updateFlowJSON` |
| **Analytics** | `getAnalytics` `getConversationAnalytics` `getTemplateAnalytics` |
| **Broadcast** | `broadcastTemplate` |
| **Webhooks** | `verifyWebhook` `parseWebhook` `validateSignature` `parseWebhookWithSignature` |

## Usage

### Setup

```ts
import { WhatsApp } from "@saimonventura/waba"

const wa = new WhatsApp({
  phoneNumberId: "YOUR_PHONE_NUMBER_ID",
  accessToken: "YOUR_ACCESS_TOKEN",
  wabaId: "YOUR_WABA_ID",   // required for templates, analytics, flows, health
  apiVersion: "v25.0",      // optional, defaults to v25.0
})
```

### Text Messages

```ts
await wa.sendText(to, "Hello!")
await wa.sendText(to, "Check this: https://example.com", { previewUrl: true })
await wa.sendText(to, "Reply to this", { replyTo: "wamid.xxx" })
```

### Media

```ts
await wa.sendImage(to, { url: "https://example.com/photo.jpg" }, "Caption")
await wa.sendAudio(to, { id: "media_id_from_upload" })
await wa.sendVideo(to, { url: "https://example.com/video.mp4" }, "Caption")
await wa.sendDocument(to, { url: "https://example.com/file.pdf" }, "invoice.pdf", "Your invoice")
await wa.sendSticker(to, { url: "https://example.com/sticker.webp" })
```

### Interactive Messages

```ts
// Buttons (up to 3)
await wa.sendButtons(to, "Choose an option:", [
  { id: "yes", title: "Yes" },
  { id: "no", title: "No" },
], { header: "Confirm", footer: "Tap a button" })

// List
await wa.sendList(to, "Our menu:", "View options", [
  {
    title: "Category A",
    rows: [
      { id: "item_1", title: "Item 1", description: "Description" },
      { id: "item_2", title: "Item 2" },
    ],
  },
])

// CTA URL
await wa.sendCTA(to, "Visit our website", {
  text: "Open",
  url: "https://example.com",
})

// Product (requires catalog)
await wa.sendProduct(to, "CATALOG_ID", "PRODUCT_RETAILER_ID", "Check this out")

// Location Request
await wa.sendLocationRequest(to, "Please share your delivery address")

// Flow
await wa.sendFlow(to, "Complete your order", {
  flowId: "FLOW_ID",
  flowCta: "Start",
  mode: "published",
})
```

### Location & Contacts

```ts
await wa.sendLocation(to, {
  lat: -23.55,
  lng: -46.63,
  name: "Office",
  address: "Sao Paulo, SP",
})

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

### Templates

```ts
// Send a template
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

### Media Management

```ts
const { id } = await wa.uploadMedia(fileBytes, "image/jpeg")
const { url } = await wa.getMediaUrl(id)
const bytes = await wa.downloadMedia(url)
await wa.deleteMedia(id)
```

### Business Profile

```ts
const profile = await wa.getBusinessProfile()
await wa.updateBusinessProfile({ about: "We deliver great products" })
```

### Phone Management

```ts
const info = await wa.getPhoneInfo()
await wa.registerPhone("123456")
await wa.requestVerificationCode("SMS")
await wa.verifyCode("123456")
```

### QR Codes

```ts
const qr = await wa.createQR("Hello! How can I help you?", "png")
console.log(qr.deep_link_url, qr.qr_image_url)

const { data: codes } = await wa.listQRCodes()
await wa.updateQR(codes[0].code, "Updated message")
await wa.deleteQR(codes[0].code)
```

### Analytics

```ts
// Requires wabaId
const now = Math.floor(Date.now() / 1000)
const thirtyDaysAgo = now - 86400 * 30

const analytics = await wa.getAnalytics(thirtyDaysAgo, now, "DAY")
const conversations = await wa.getConversationAnalytics(thirtyDaysAgo, now, "DAILY")
```

### Broadcast

```ts
const result = await wa.broadcastTemplate(
  ["5511999999999", "5511888888888"],
  "promo_campaign",
  "pt_BR",
  [{ type: "body", parameters: [{ type: "text", text: "20% OFF" }] }],
  { batchSize: 50, delayMs: 100 },
)

console.log(`Sent: ${result.succeeded.length}, Failed: ${result.failed.length}`)
```

### Webhooks

```ts
import { verifyWebhook, parseWebhook, validateSignature } from "@saimonventura/waba"

// Verification (GET)
const challenge = verifyWebhook(req.query, "YOUR_VERIFY_TOKEN")

// Parse events (POST)
const events = parseWebhook(req.body)

for (const event of events) {
  switch (event.type) {
    case "message":
      console.log(event.message.type, event.contact.profile.name)
      break
    case "status":
      console.log(event.status.status) // sent | delivered | read | failed
      break
  }
}

// HMAC signature verification
const isValid = validateSignature(rawBody, req.headers["x-hub-signature-256"], APP_SECRET)
```

## Error Handling

```ts
import { WhatsAppError } from "@saimonventura/waba"

try {
  await wa.sendText(to, "Hello")
} catch (err) {
  if (err instanceof WhatsAppError) {
    console.log(err.code)       // Meta error code (e.g. 131030)
    console.log(err.httpStatus) // HTTP status (e.g. 400, 429)
    console.log(err.message)    // Human-readable error message
  }
}
```

## TypeScript

All types are exported:

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

## License

MIT
