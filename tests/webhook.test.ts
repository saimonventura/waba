import { describe, it, expect } from "vitest";
import { verifyWebhook, parseWebhook, validateSignature, parseWebhookWithSignature } from "../src/webhook.js";
import { createHmac } from "node:crypto";

describe("verifyWebhook", () => {
  it("should return challenge when token matches", () => {
    const result = verifyWebhook(
      {
        "hub.mode": "subscribe",
        "hub.verify_token": "my-token",
        "hub.challenge": "challenge123",
      },
      "my-token"
    );
    expect(result).toBe("challenge123");
  });

  it("should throw when token does not match", () => {
    expect(() =>
      verifyWebhook(
        {
          "hub.mode": "subscribe",
          "hub.verify_token": "wrong",
          "hub.challenge": "c",
        },
        "my-token"
      )
    ).toThrow("Webhook verification failed");
  });

  it("should throw when mode is not subscribe", () => {
    expect(() =>
      verifyWebhook(
        {
          "hub.mode": "unsubscribe",
          "hub.verify_token": "my-token",
          "hub.challenge": "c",
        },
        "my-token"
      )
    ).toThrow("Webhook verification failed");
  });
});

describe("parseWebhook", () => {
  it("should parse text message", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "5511999999999",
                  phone_number_id: "123",
                },
                contacts: [
                  { profile: { name: "João" }, wa_id: "5511999887766" },
                ],
                messages: [
                  {
                    from: "5511999887766",
                    id: "wamid.abc",
                    timestamp: "1740000000",
                    type: "text",
                    text: { body: "Olá!" },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const events = parseWebhook(payload);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("message");
    if (events[0].type === "message") {
      expect(events[0].message.type).toBe("text");
      if (events[0].message.type === "text") {
        expect(events[0].message.text.body).toBe("Olá!");
      }
      expect(events[0].message.from).toBe("5511999887766");
      expect(events[0].contact.profile.name).toBe("João");
      expect(events[0].metadata.phone_number_id).toBe("123");
    }
  });

  it("should parse image message", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "55149",
                  phone_number_id: "123",
                },
                contacts: [
                  { profile: { name: "Maria" }, wa_id: "5511888" },
                ],
                messages: [
                  {
                    from: "5511888",
                    id: "wamid.img",
                    timestamp: "1740000001",
                    type: "image",
                    image: {
                      id: "media123",
                      mime_type: "image/jpeg",
                      sha256: "abc",
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const events = parseWebhook(payload);
    expect(events).toHaveLength(1);
    if (events[0].type === "message") {
      expect(events[0].message.type).toBe("image");
    }
  });

  it("should parse status delivered", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "55149",
                  phone_number_id: "123",
                },
                statuses: [
                  {
                    id: "wamid.sent1",
                    status: "delivered",
                    timestamp: "1740000002",
                    recipient_id: "5511999",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const events = parseWebhook(payload);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("status");
    if (events[0].type === "status") {
      expect(events[0].status.status).toBe("delivered");
      expect(events[0].status.recipient_id).toBe("5511999");
    }
  });

  it("should parse failed status with errors", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "55149",
                  phone_number_id: "123",
                },
                statuses: [
                  {
                    id: "wamid.fail1",
                    status: "failed",
                    timestamp: "1740000003",
                    recipient_id: "5511999",
                    errors: [
                      { code: 131047, title: "Re-engagement message" },
                    ],
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const events = parseWebhook(payload);
    expect(events).toHaveLength(1);
    if (events[0].type === "status") {
      expect(events[0].status.status).toBe("failed");
      expect(events[0].status.errors).toHaveLength(1);
      expect(events[0].status.errors![0].code).toBe(131047);
    }
  });

  it("should parse interactive button reply", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "55149",
                  phone_number_id: "123",
                },
                contacts: [
                  { profile: { name: "Pedro" }, wa_id: "5511777" },
                ],
                messages: [
                  {
                    from: "5511777",
                    id: "wamid.btn1",
                    timestamp: "1740000004",
                    type: "interactive",
                    interactive: {
                      type: "button_reply",
                      button_reply: { id: "btn_1", title: "Opção 1" },
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const events = parseWebhook(payload);
    if (
      events[0].type === "message" &&
      events[0].message.type === "interactive"
    ) {
      expect(events[0].message.interactive.button_reply?.title).toBe(
        "Opção 1"
      );
    }
  });

  it("should return empty array for invalid payload", () => {
    expect(parseWebhook(null)).toEqual([]);
    expect(parseWebhook({})).toEqual([]);
    expect(parseWebhook({ object: "other" })).toEqual([]);
    expect(parseWebhook("not json")).toEqual([]);
  });

  it("should parse multiple messages in same entry", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "55149",
                  phone_number_id: "123",
                },
                contacts: [
                  { profile: { name: "A" }, wa_id: "551" },
                  { profile: { name: "B" }, wa_id: "552" },
                ],
                messages: [
                  {
                    from: "551",
                    id: "m1",
                    timestamp: "1",
                    type: "text",
                    text: { body: "msg1" },
                  },
                  {
                    from: "552",
                    id: "m2",
                    timestamp: "2",
                    type: "text",
                    text: { body: "msg2" },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const events = parseWebhook(payload);
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("message");
    expect(events[1].type).toBe("message");
  });

  it("should handle messages and statuses in same payload", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "55149",
                  phone_number_id: "123",
                },
                contacts: [{ profile: { name: "X" }, wa_id: "550" }],
                messages: [
                  {
                    from: "550",
                    id: "m1",
                    timestamp: "1",
                    type: "text",
                    text: { body: "hi" },
                  },
                ],
                statuses: [
                  {
                    id: "s1",
                    status: "read",
                    timestamp: "2",
                    recipient_id: "550",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };
    const events = parseWebhook(payload);
    expect(events).toHaveLength(2);
    const types = events.map((e) => e.type);
    expect(types).toContain("message");
    expect(types).toContain("status");
  });
});

// Helper to create valid HMAC signature
function sign(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex")
}

describe("validateSignature", () => {
  const SECRET = "my-app-secret"

  it("should return true for valid signature", () => {
    const body = '{"object":"whatsapp_business_account"}'
    const sig = sign(body, SECRET)
    expect(validateSignature(body, sig, SECRET)).toBe(true)
  })

  it("should return false for invalid signature", () => {
    const body = '{"object":"whatsapp_business_account"}'
    expect(validateSignature(body, "sha256=invalid", SECRET)).toBe(false)
  })

  it("should return false for tampered body", () => {
    const body = '{"object":"whatsapp_business_account"}'
    const sig = sign(body, SECRET)
    expect(validateSignature(body + "tampered", sig, SECRET)).toBe(false)
  })

  it("should return false for missing sha256= prefix", () => {
    const body = "test"
    const hash = createHmac("sha256", SECRET).update(body).digest("hex")
    expect(validateSignature(body, hash, SECRET)).toBe(false)
  })

  it("should work with Buffer body", () => {
    const body = Buffer.from('{"test":true}')
    const sig = sign(body.toString(), SECRET)
    expect(validateSignature(body, sig, SECRET)).toBe(true)
  })
})

describe("parseWebhookWithSignature", () => {
  const SECRET = "my-app-secret"

  it("should parse valid signed webhook", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "WABA_ID",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "55149", phone_number_id: "123" },
            contacts: [{ profile: { name: "Test" }, wa_id: "550" }],
            messages: [{ from: "550", id: "m1", timestamp: "1", type: "text", text: { body: "hi" } }],
          },
          field: "messages",
        }],
      }],
    }
    const body = JSON.stringify(payload)
    const sig = sign(body, SECRET)
    const events = parseWebhookWithSignature(body, sig, SECRET)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe("message")
  })

  it("should throw on invalid signature", () => {
    const body = '{"object":"whatsapp_business_account","entry":[]}'
    expect(() => parseWebhookWithSignature(body, "sha256=bad", SECRET)).toThrow("Invalid webhook signature")
  })
})
