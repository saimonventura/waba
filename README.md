# @saimonventura/waba

WhatsApp Cloud API SDK for Node.js — zero dependencies, full API coverage.

```ts
import { WhatsApp } from "@saimonventura/waba"

const wa = new WhatsApp({
  phoneNumberId: "1011430905390882",
  accessToken: "EAA...",
})

await wa.sendText("5514991178228", "Hello from waba!")
```

## Features

- Zero runtime dependencies — uses native `fetch` and `FormData`
- Full WhatsApp Cloud API v25.0 coverage
- TypeScript-first with 33 exported types
- Works on Node.js 18+, Bun, Deno
- 62 unit tests

## Install

```bash
# From GitHub (private)
npm install github:saimonventura/waba
```

## Usage

### Setup

```ts
import { WhatsApp } from "@saimonventura/waba"

const wa = new WhatsApp({
  phoneNumberId: "YOUR_PHONE_NUMBER_ID",
  accessToken: "YOUR_ACCESS_TOKEN",
  wabaId: "YOUR_WABA_ID",        // optional, needed for template CRUD
  apiVersion: "v25.0",            // optional, defaults to v25.0
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
await wa.sendVideo(to, { url: "https://example.com/video.mp4" })
await wa.sendDocument(to, { url: "https://example.com/file.pdf" }, "invoice.pdf")
await wa.sendSticker(to, { url: "https://example.com/sticker.webp" })
```

### Interactive Messages

```ts
// Buttons (up to 3)
await wa.sendButtons(to, "Choose:", [
  { id: "yes", title: "Yes" },
  { id: "no", title: "No" },
], { header: "Confirm", footer: "Tap a button" })

// List
await wa.sendList(to, "Our menu:", "View options", [
  {
    title: "Meats",
    rows: [
      { id: "picanha", title: "Picanha", description: "R$ 89.90/kg" },
      { id: "alcatra", title: "Alcatra", description: "R$ 59.90/kg" },
    ],
  },
])

// CTA URL
await wa.sendCTA(to, "Visit us!", { text: "Open website", url: "https://example.com" })

// Product (requires catalog)
await wa.sendProduct(to, "CATALOG_ID", "PRODUCT_ID", "Check this out")
```

### Location & Contacts

```ts
await wa.sendLocation(to, { lat: -22.33, lng: -49.07, name: "Office", address: "Bauru, SP" })
await wa.sendContacts(to, [{ name: { formatted_name: "John" }, phones: [{ phone: "+1234" }] }])
```

### Reactions

```ts
await wa.sendReaction(to, "wamid.xxx", "\u{1f44d}")
await wa.removeReaction(to, "wamid.xxx")
```

### Read Receipts

```ts
await wa.markAsRead("wamid.xxx")
```

### Templates

```ts
// Send
await wa.sendTemplate(to, "hello_world", "en_US")

// With parameters
await wa.sendTemplate(to, "order_update", "pt_BR", [
  { type: "body", parameters: [{ type: "text", text: "Pedido #123" }] },
])

// CRUD (requires wabaId)
const templates = await wa.listTemplates({ status: "APPROVED" })
await wa.createTemplate({ name: "my_template", language: "pt_BR", category: "UTILITY", components: [] })
await wa.deleteTemplate("my_template")
```

### Media Management

```ts
// Upload
const { id } = await wa.uploadMedia(fileBytes, "image/jpeg")

// Get URL (URLs expire after a few days)
const { url } = await wa.getMediaUrl("media_id")

// Download
const bytes = await wa.downloadMedia(url)

// Delete
await wa.deleteMedia("media_id")
```

### Business Profile

```ts
const profile = await wa.getBusinessProfile()
await wa.updateBusinessProfile({ about: "We sell great products" })
```

### Phone Management

```ts
const info = await wa.getPhoneInfo()
await wa.registerPhone("123456")
await wa.requestVerificationCode("SMS")
await wa.verifyCode("123456")
```

### Webhooks

```ts
import { verifyWebhook, parseWebhook } from "@saimonventura/waba"

// Verification (GET request from Meta)
const challenge = verifyWebhook(query, "your_verify_token")

// Parse incoming webhook (POST from Meta)
const events = parseWebhook(requestBody)

for (const event of events) {
  switch (event.type) {
    case "message":
      console.log(event.message.type, event.contact.profile.name)
      break
    case "status":
      console.log(event.status.status) // sent | delivered | read | failed
      break
    case "error":
      console.log(event.errors)
      break
  }
}

// Also available as static methods
WhatsApp.verifyWebhook(query, token)
WhatsApp.parseWebhook(body)
```

## Types

All types are exported for TypeScript consumers:

```ts
import type {
  WhatsAppConfig,
  SendMessageResult,
  InboundMessage,
  WebhookEvent,
  StatusUpdate,
  MediaSource,
  Button,
  ListSection,
  TemplateComponent,
} from "@saimonventura/waba"
```

## Error Handling

```ts
import { WhatsAppError } from "@saimonventura/waba"

try {
  await wa.sendText(to, "Hello")
} catch (err) {
  if (err instanceof WhatsAppError) {
    console.log(err.code)       // Meta error code
    console.log(err.title)      // e.g. "Rate limit hit"
    console.log(err.httpStatus) // e.g. 429
    console.log(err.details)    // full error body from Meta
  }
}
```

## License

Private — (c) Saimon Marcolino Ventura
