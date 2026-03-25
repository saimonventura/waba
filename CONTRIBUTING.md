# Contributing to @saimonventura/waba

PRs are welcome! Whether it's a bug fix, new Cloud API feature, or documentation improvement.

## Setup

```bash
git clone https://github.com/saimonventura/waba.git
cd waba
pnpm install
pnpm test       # run all tests
pnpm build      # compile TypeScript
```

## Development Workflow

1. **Fork & branch** — create a feature branch from `main`
2. **Write tests first** — we follow TDD. Add failing tests, then implement
3. **Run the full suite** — `pnpm test` must pass (all existing + new tests)
4. **Build** — `pnpm build` must succeed with zero errors
5. **Open a PR** — fill in the template, link any related issues

## Code Conventions

### Zero Dependencies

This SDK has **zero runtime dependencies** by design. We use only:
- Native `fetch` and `FormData`
- `node:crypto` for HMAC/encryption
- Standard TypeScript

Do not add any `dependencies` to `package.json`. Dev dependencies are fine.

### File Structure

```
src/
├── client.ts    — WhatsApp class (all API methods)
├── types.ts     — Interfaces only, zero runtime code
├── errors.ts    — WhatsAppError class
├── webhook.ts   — Webhook verification & parsing
└── index.ts     — Barrel exports
```

- **New API methods** go in `client.ts` using `this.sendMessage()` or `this.request()`
- **New types** go in `types.ts` — keep it runtime-free
- **New modules** (e.g., middleware) get their own file under `src/`

### Test Patterns

We use [Vitest](https://vitest.dev/). Every test file follows this pattern:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const PHONE_ID = "123456789"
const TOKEN = "test-token"
const WABA_ID = "WABA_123"

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

function parseFetchBody(mock: ReturnType<typeof vi.fn>): any {
  return JSON.parse(mock.mock.calls[0][1].body)
}

function parseFetchUrl(mock: ReturnType<typeof vi.fn>): string {
  return mock.mock.calls[0][0]
}
```

### Style

- TypeScript strict mode
- ESM only (`import`/`export`, `.js` extensions in imports)
- No semicolons (project convention — the existing code omits them in most places)
- `camelCase` for method names, `snake_case` for wire-format fields that pass through to the API

## What to Contribute

Check the [issues](https://github.com/saimonventura/waba/issues) or pick from these areas:

- **New Cloud API features** — Meta adds new endpoints regularly
- **More framework middlewares** — Next.js, Fastify, Cloudflare Workers, etc.
- **Documentation** — examples, guides, translations
- **Bug fixes** — especially edge cases in webhook parsing

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
