/**
 * Smoke Test — Testa envio real de mensagens via Cloud API usando o SDK
 *
 * Uso: WABA_ACCESS_TOKEN=xxx npx tsx smoke-test.ts
 *
 * Precisa de janela 24h aberta (cliente mandou msg pro número da Wing primeiro)
 */

import { WhatsApp } from "./src/index.js"

const PHONE_ID = process.env.WABA_PHONE_ID || "1011430905390882"
const TOKEN = process.env.WABA_ACCESS_TOKEN || ""
const WABA_ID = process.env.WABA_WABA_ID || "1455183546246581"
const TO = process.env.WABA_TO || "351965561444"

if (!TOKEN) {
  console.error("❌ WABA_ACCESS_TOKEN não configurado")
  process.exit(1)
}

const wa = new WhatsApp({
  phoneNumberId: PHONE_ID,
  accessToken: TOKEN,
  wabaId: WABA_ID,
})

// Helpers
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
let passed = 0
let failed = 0

async function test(name: string, fn: () => Promise<any>) {
  try {
    const result = await fn()
    const msgId = result?.messages?.[0]?.id || "ok"
    console.log(`  ✅ ${name} — ${msgId}`)
    passed++
  } catch (err: any) {
    const detail = err?.details?.message || err?.message || String(err)
    console.log(`  ❌ ${name} — ${detail}`)
    failed++
  }
  await sleep(1500) // rate limit gentil
}

// ── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n═══════════════════════════════════════════════`)
  console.log(`🧪 Smoke Test — @saimonventura/waba`)
  console.log(`═══════════════════════════════════════════════`)
  console.log(`📱 Phone ID: ${PHONE_ID}`)
  console.log(`📞 Enviando para: ${TO}`)
  console.log(`🏢 WABA ID: ${WABA_ID}`)
  console.log(`───────────────────────────────────────────────\n`)

  // 1. Texto simples
  console.log("📝 Messaging")
  await test("sendText", () =>
    wa.sendText(TO, "🧪 Smoke test do SDK @saimonventura/waba!")
  )

  // 2. Texto com preview URL
  await test("sendText (preview URL)", () =>
    wa.sendText(TO, "Olha esse site: https://wing.solutions", { previewUrl: true })
  )

  // 3. Reação
  // Precisa de um message ID real — vamos pegar do primeiro envio
  // Skip se não tiver

  // 4. Read receipt
  await test("markAsRead (fake ID — esperado erro)", () =>
    wa.markAsRead("wamid.FAKE_ID_FOR_TEST").catch(() => { throw new Error("esperado") })
  )

  // ── Interactive ──
  console.log("\n🔘 Interactive")

  await test("sendButtons (2 botões)", () =>
    wa.sendButtons(TO, "Escolha uma opção:", [
      { id: "btn_sim", title: "Sim" },
      { id: "btn_nao", title: "Não" },
    ], { header: "Confirmação", footer: "Smoke test" })
  )

  await test("sendButtons (3 botões)", () =>
    wa.sendButtons(TO, "Qual o tamanho?", [
      { id: "p", title: "Pequeno" },
      { id: "m", title: "Médio" },
      { id: "g", title: "Grande" },
    ])
  )

  await test("sendList", () =>
    wa.sendList(TO, "Nosso cardápio:", "Ver opções", [
      {
        title: "Carnes",
        rows: [
          { id: "picanha", title: "Picanha", description: "R$ 89,90/kg" },
          { id: "alcatra", title: "Alcatra", description: "R$ 59,90/kg" },
        ],
      },
      {
        title: "Aves",
        rows: [
          { id: "frango", title: "Frango Inteiro", description: "R$ 14,90/kg" },
        ],
      },
    ], { header: "Cardápio", footer: "Preços sujeitos a alteração" })
  )

  await test("sendCTA", () =>
    wa.sendCTA(TO, "Conheça nosso site!", {
      text: "Visitar Wing Solutions",
      url: "https://wing.solutions",
    }, { footer: "Smoke test" })
  )

  // ── Location ──
  console.log("\n📍 Location")

  await test("sendLocation", () =>
    wa.sendLocation(TO, {
      lat: -22.3285,
      lng: -49.0712,
      name: "Wing Solutions",
      address: "Bauru, SP - Brasil",
    })
  )

  // ── Profile ──
  console.log("\n👤 Profile & Phone")

  await test("getBusinessProfile", () =>
    wa.getBusinessProfile()
  )

  await test("getPhoneInfo", () =>
    wa.getPhoneInfo()
  )

  // ── Templates ──
  console.log("\n📋 Templates")

  await test("listTemplates", () =>
    wa.listTemplates()
  )

  // ── Resultado ──
  console.log(`\n═══════════════════════════════════════════════`)
  console.log(`📊 Resultado: ${passed} passed, ${failed} failed`)
  console.log(`═══════════════════════════════════════════════\n`)
}

main().catch(console.error)
