import type {
  WhatsAppConfig, MediaSource, SendMessageOptions, SendMessageResult,
  InteractiveOptions, Button, ListSection, CTAAction, LocationData, ContactData,
} from "./types.js"
import { WhatsAppError } from "./errors.js"

const DEFAULT_API_VERSION = "v22.0"
const GRAPH_URL = "https://graph.facebook.com"

export class WhatsApp {
  private readonly phoneNumberId: string
  private readonly accessToken: string
  private readonly apiVersion: string
  readonly wabaId?: string

  constructor(config: WhatsAppConfig) {
    this.phoneNumberId = config.phoneNumberId
    this.accessToken = config.accessToken
    this.apiVersion = config.apiVersion || DEFAULT_API_VERSION
    this.wabaId = config.wabaId
  }

  // ── Private: Base HTTP ──

  private get baseUrl(): string {
    return `${GRAPH_URL}/${this.apiVersion}`
  }

  private async request<T = any>(path: string, options?: { method?: string, body?: any, headers?: Record<string, string> }): Promise<T> {
    const url = `${this.baseUrl}/${path}`
    const method = options?.method || "POST"
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.accessToken}`,
      ...options?.headers,
    }

    const fetchOptions: RequestInit = { method, headers }

    if (options?.body !== undefined) {
      if (options.body instanceof FormData) {
        // Let fetch set content-type for FormData (includes boundary)
        fetchOptions.body = options.body
      } else {
        headers["Content-Type"] = "application/json"
        fetchOptions.body = JSON.stringify(options.body)
      }
    }

    const response = await fetch(url, fetchOptions)

    // Handle non-JSON responses (e.g., media download)
    const contentType = response.headers.get("content-type") || ""

    if (!response.ok) {
      let errorBody: any
      try { errorBody = await response.json() } catch { errorBody = {} }
      throw WhatsAppError.fromApiResponse(errorBody, response.status)
    }

    if (contentType.includes("application/json")) {
      return response.json() as Promise<T>
    }

    // For binary responses (media download)
    return response as any
  }

  // ── Private: Send Message Helper ──

  private async sendMessage(to: string, type: string, content: Record<string, any>, options?: SendMessageOptions): Promise<SendMessageResult> {
    const body: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type,
      ...content,
    }

    if (options?.replyTo) {
      body.context = { message_id: options.replyTo }
    }

    return this.request<SendMessageResult>(`${this.phoneNumberId}/messages`, { body })
  }

  // ── Messaging: Text ──

  async sendText(to: string, body: string, options?: SendMessageOptions): Promise<SendMessageResult> {
    return this.sendMessage(to, "text", {
      text: { preview_url: options?.previewUrl ?? false, body },
    }, options)
  }

  // ── Messaging: Media ──

  async sendImage(to: string, media: MediaSource, caption?: string): Promise<SendMessageResult> {
    const image: any = "url" in media ? { link: media.url } : { id: media.id }
    if (caption) image.caption = caption
    return this.sendMessage(to, "image", { image })
  }

  async sendAudio(to: string, media: MediaSource): Promise<SendMessageResult> {
    const audio = "url" in media ? { link: media.url } : { id: media.id }
    return this.sendMessage(to, "audio", { audio })
  }

  async sendVideo(to: string, media: MediaSource, caption?: string): Promise<SendMessageResult> {
    const video: any = "url" in media ? { link: media.url } : { id: media.id }
    if (caption) video.caption = caption
    return this.sendMessage(to, "video", { video })
  }

  async sendDocument(to: string, media: MediaSource, filename?: string, caption?: string): Promise<SendMessageResult> {
    const document: any = "url" in media ? { link: media.url } : { id: media.id }
    if (filename) document.filename = filename
    if (caption) document.caption = caption
    return this.sendMessage(to, "document", { document })
  }

  async sendSticker(to: string, media: MediaSource): Promise<SendMessageResult> {
    const sticker = "url" in media ? { link: media.url } : { id: media.id }
    return this.sendMessage(to, "sticker", { sticker })
  }

  // ── Messaging: Location ──

  async sendLocation(to: string, location: LocationData): Promise<SendMessageResult> {
    return this.sendMessage(to, "location", {
      location: {
        latitude: location.lat,
        longitude: location.lng,
        name: location.name,
        address: location.address,
      },
    })
  }

  // ── Messaging: Contacts ──

  async sendContacts(to: string, contacts: ContactData[]): Promise<SendMessageResult> {
    return this.sendMessage(to, "contacts", { contacts })
  }

  // ── Messaging: Reactions ──

  async sendReaction(to: string, messageId: string, emoji: string): Promise<SendMessageResult> {
    return this.sendMessage(to, "reaction", {
      reaction: { message_id: messageId, emoji },
    })
  }

  async removeReaction(to: string, messageId: string): Promise<SendMessageResult> {
    return this.sendMessage(to, "reaction", {
      reaction: { message_id: messageId, emoji: "" },
    })
  }

  // ── Messaging: Read Receipts ──

  async markAsRead(messageId: string): Promise<any> {
    return this.request(`${this.phoneNumberId}/messages`, {
      body: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
    })
  }

  // ── Interactive: Buttons ──

  async sendButtons(to: string, body: string, buttons: Button[], options?: InteractiveOptions): Promise<SendMessageResult> {
    const interactive: any = {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.map(b => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    }
    if (options?.header) interactive.header = { type: "text", text: options.header }
    if (options?.footer) interactive.footer = { text: options.footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Interactive: List ──

  async sendList(to: string, body: string, buttonText: string, sections: ListSection[], options?: InteractiveOptions): Promise<SendMessageResult> {
    const interactive: any = {
      type: "list",
      body: { text: body },
      action: {
        button: buttonText,
        sections,
      },
    }
    if (options?.header) interactive.header = { type: "text", text: options.header }
    if (options?.footer) interactive.footer = { text: options.footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Interactive: CTA URL ──

  async sendCTA(to: string, body: string, cta: CTAAction, options?: InteractiveOptions): Promise<SendMessageResult> {
    const interactive: any = {
      type: "cta_url",
      body: { text: body },
      action: {
        name: "cta_url",
        parameters: {
          display_text: cta.text,
          url: cta.url,
        },
      },
    }
    if (options?.header) interactive.header = { type: "text", text: options.header }
    if (options?.footer) interactive.footer = { text: options.footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Interactive: Product ──

  async sendProduct(to: string, catalogId: string, productId: string, body?: string): Promise<SendMessageResult> {
    const interactive: any = {
      type: "product",
      action: {
        catalog_id: catalogId,
        product_retailer_id: productId,
      },
    }
    if (body) interactive.body = { text: body }
    return this.sendMessage(to, "interactive", { interactive })
  }
}
