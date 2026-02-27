# WABA SDK — Contributor Guide

WhatsApp Cloud API v25.0 SDK for TypeScript. Zero runtime dependencies.

## Architecture

Single class (`WhatsApp`) in `src/client.ts` exposes all API methods. Types in `src/types.ts`. Webhook parsing in `src/webhook.ts`. Errors in `src/errors.ts`.

```
src/
├── client.ts    # WhatsApp class — all API methods (66 public methods)
├── types.ts     # All TypeScript interfaces and types (40+ exports)
├── webhook.ts   # verifyWebhook, parseWebhook, validateSignature, parseWebhookWithSignature
├── errors.ts    # WhatsAppError class
└── index.ts     # Barrel exports
```

## Adding a New Method

1. **Type** — Add interface to `src/types.ts` if needed
2. **Method** — Add to `WhatsApp` class in `src/client.ts`
3. **Test** — Add to appropriate test file in `tests/`
4. **Export** — Types auto-export via `export * from "./types.js"`

All methods follow the same pattern:
```ts
async methodName(args): Promise<ReturnType> {
  return this.request<ReturnType>(`${this.phoneNumberId}/endpoint`, {
    method: "GET" | "POST" | "DELETE",
    body: { ... },  // omit for GET
  })
}
```

Methods requiring `wabaId` should throw: `if (!this.wabaId) throw new Error("wabaId is required for ...")`

## Test Patterns

Every test file uses these shared helpers:

```ts
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

function parseFetchUrl(mock): string     // Extract URL from fetch call
function parseFetchBody(mock): any       // Extract parsed JSON body
```

Tests verify: correct URL, correct HTTP method, correct request body, correct return value.

## Conventions

- **Zero runtime dependencies** — only `node:crypto` (built-in) and `fetch` (global)
- **No message classes** — methods take primitives, not objects. `wa.sendText(to, body)` not `wa.send(new Text(body))`
- **Method naming** — `send` prefix for messages, `get`/`list`/`create`/`update`/`delete` for management
- **MediaSource** — always `{ url: string } | { id: string }`, never separate params
- **Options last** — optional params always in trailing options object
- **No overloading** — separate methods for distinct operations (e.g., `sendReaction` vs `removeReaction`)

## Commands

```bash
pnpm test          # Run 101 tests
pnpm build         # TypeScript build to dist/
pnpm test:watch    # Watch mode
```

## API Version

Currently targets Cloud API `v25.0`. The version is set in `src/client.ts`:
```ts
const DEFAULT_API_VERSION = "v25.0"
```
