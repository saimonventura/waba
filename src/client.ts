import type {
  WhatsAppConfig, MediaSource, SendMessageOptions, SendMessageResult,
  InteractiveOptions, Button, ListSection, CTAAction, LocationData, ContactData,
  TemplateComponent, TemplateCreateRequest, MediaUploadResult, MediaUrlResult,
  BusinessProfile, PhoneInfo,
} from "./types.js"
import { WhatsAppError } from "./errors.js"
import { verifyWebhook, parseWebhook } from "./webhook.js"
import type { VerifyQuery } from "./webhook.js"
import type { WebhookEvent } from "./types.js"

const DEFAULT_API_VERSION = "v25.0"
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

  // ── Templates ──

  async sendTemplate(to: string, name: string, languageCode: string, components?: TemplateComponent[]): Promise<SendMessageResult> {
    const template: any = {
      name,
      language: { code: languageCode },
    }
    if (components) template.components = components
    return this.sendMessage(to, "template", { template })
  }

  async listTemplates(filters?: { status?: string; category?: string }): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for template management")
    let path = `${this.wabaId}/message_templates`
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.category) params.set("category", filters.category)
    const qs = params.toString()
    if (qs) path += `?${qs}`
    return this.request(path, { method: "GET" })
  }

  async createTemplate(template: TemplateCreateRequest): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for template management")
    return this.request(`${this.wabaId}/message_templates`, { body: template })
  }

  async deleteTemplate(name: string): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for template management")
    return this.request(`${this.wabaId}/message_templates?name=${encodeURIComponent(name)}`, { method: "DELETE" })
  }

  // ── Media Management ──

  async uploadMedia(file: Uint8Array | Blob, mimeType: string): Promise<MediaUploadResult> {
    const form = new FormData()
    const blob = file instanceof Blob ? file : new Blob([file as BlobPart], { type: mimeType })
    form.append("file", blob, "file")
    form.append("messaging_product", "whatsapp")
    form.append("type", mimeType)
    return this.request<MediaUploadResult>(`${this.phoneNumberId}/media`, { body: form })
  }

  async getMediaUrl(mediaId: string): Promise<MediaUrlResult> {
    return this.request<MediaUrlResult>(mediaId, { method: "GET" })
  }

  async downloadMedia(url: string): Promise<Uint8Array> {
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${this.accessToken}` },
    })
    if (!response.ok) {
      throw new WhatsAppError({
        message: `Media download failed: ${response.status}`,
        code: response.status,
        title: "Media download error",
        httpStatus: response.status,
      })
    }
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  async deleteMedia(mediaId: string): Promise<any> {
    return this.request(mediaId, { method: "DELETE" })
  }

  // ── Business Profile ──

  async getBusinessProfile(fields?: string[]): Promise<BusinessProfile> {
    const allFields = fields || ["about", "address", "description", "email", "websites", "vertical", "profile_picture_url"]
    const path = `${this.phoneNumberId}/whatsapp_business_profile?fields=${allFields.join(",")}`
    const result = await this.request<{ data: BusinessProfile[] }>(path, { method: "GET" })
    return result.data?.[0] || {}
  }

  async updateBusinessProfile(data: Partial<BusinessProfile>): Promise<any> {
    return this.request(`${this.phoneNumberId}/whatsapp_business_profile`, {
      body: { messaging_product: "whatsapp", ...data },
    })
  }

  // ── Phone Number Management ──

  async getPhoneInfo(): Promise<PhoneInfo> {
    return this.request<PhoneInfo>(this.phoneNumberId, { method: "GET" })
  }

  async registerPhone(pin: string): Promise<any> {
    return this.request(`${this.phoneNumberId}/register`, {
      body: { messaging_product: "whatsapp", pin },
    })
  }

  async deregisterPhone(): Promise<any> {
    return this.request(`${this.phoneNumberId}/deregister`, { body: { messaging_product: "whatsapp" } })
  }

  async requestVerificationCode(method: "SMS" | "VOICE"): Promise<any> {
    return this.request(`${this.phoneNumberId}/request_code`, {
      body: { code_method: method },
    })
  }

  async verifyCode(code: string): Promise<any> {
    return this.request(`${this.phoneNumberId}/verify_code`, {
      body: { code },
    })
  }

  // ── Webhook (Static) ──────────────────────────────────────────────────

  static verifyWebhook(query: VerifyQuery, verifyToken: string): string {
    return verifyWebhook(query, verifyToken)
  }

  static parseWebhook(body: unknown): WebhookEvent[] {
    return parseWebhook(body)
  }
}
