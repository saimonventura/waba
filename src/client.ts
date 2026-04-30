import type {
  WhatsAppConfig, MediaSource, SendMessageOptions, SendMessageResult,
  InteractiveOptions, Button, ListSection, CTAAction, LocationData, ContactData,
  TemplateComponent, TemplateCreateRequest, TemplateUpdateRequest, MediaUploadResult, MediaUrlResult,
  BusinessProfile, PhoneInfo, ProductSection, AddressMessageOptions, FlowAction,
  CommerceSettings, HealthStatusResponse, PhoneNumberEntry, QRCode, FlowInfo,
  BroadcastResult, OrderDetailsAction, OrderDetailsOptions, OrderStatusAction, OrderStatusOptions,
  StandardTemplateComponent, CarouselCardInput, TemplateParameter,
  StandardTemplateCreateInput, CarouselTemplateCreateInput, CarouselCardCreateInput,
  StandardHeaderInput, StandardButtonInput, CarouselCardButtonInput,
  TemplateCreateResponse,
  Catalog, CatalogCreateInput, CatalogListResponse,
  Product, ProductCreateInput, ProductUpdateInput, ProductListOptions, ProductListResponse,
  ProductBatchRequest, ProductBatchResponse, ProductBatchStatus,
} from "./types.js"
import { WhatsAppError } from "./errors.js"
import { verifyWebhook, parseWebhook, validateSignature, parseWebhookWithSignature } from "./webhook.js"
import { validateText, validateButtons, validateList, validateCTA, validateInteractiveBody, validateHeaderFooter, ValidationError } from "./validate.js"
import type { VerifyQuery } from "./webhook.js"
import type { WebhookEvent } from "./types.js"

const DEFAULT_API_VERSION = "v25.0"
const GRAPH_URL = "https://graph.facebook.com"

export class WhatsApp {
  private readonly phoneNumberId: string
  private readonly accessToken: string
  private readonly apiVersion: string
  readonly wabaId?: string
  private readonly validate: boolean

  constructor(config: WhatsAppConfig) {
    this.phoneNumberId = config.phoneNumberId
    this.accessToken = config.accessToken
    this.apiVersion = config.apiVersion || DEFAULT_API_VERSION
    this.wabaId = config.wabaId
    this.validate = config.validate ?? false
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
      } else if (options.body instanceof URLSearchParams) {
        headers["Content-Type"] = "application/x-www-form-urlencoded"
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
    if (this.validate) validateText(body)
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
    if (this.validate) validateButtons(buttons, body, options?.header, options?.footer)
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
    if (this.validate) validateList(sections, body, options?.header, options?.footer)
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
    if (this.validate) { validateCTA(cta.text, cta.url); validateInteractiveBody(body); validateHeaderFooter(options?.header, options?.footer) }
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

  // ── Interactive: Product List (Multi-Product) ──

  async sendProductList(to: string, header: string, body: string, catalogId: string, sections: ProductSection[], footer?: string): Promise<SendMessageResult> {
    const interactive: any = {
      type: "product_list",
      header: { type: "text", text: header },
      body: { text: body },
      action: {
        catalog_id: catalogId,
        sections,
      },
    }
    if (footer) interactive.footer = { text: footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Interactive: Catalog Message ──

  async sendCatalog(to: string, body: string, options?: { thumbnailProductId?: string; footer?: string }): Promise<SendMessageResult> {
    const interactive: any = {
      type: "catalog_message",
      body: { text: body },
      action: {
        name: "catalog_message",
      },
    }
    if (options?.thumbnailProductId) {
      interactive.action.parameters = { thumbnail_product_retailer_id: options.thumbnailProductId }
    }
    if (options?.footer) interactive.footer = { text: options.footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Interactive: Location Request ──

  async sendLocationRequest(to: string, body: string): Promise<SendMessageResult> {
    return this.sendMessage(to, "interactive", {
      interactive: {
        type: "location_request_message",
        body: { text: body },
        action: { name: "send_location" },
      },
    })
  }

  // ── Interactive: Address Message ──

  async sendAddressMessage(to: string, body: string, options: AddressMessageOptions): Promise<SendMessageResult> {
    const interactive: any = {
      type: "address_message",
      body: { text: body },
      action: {
        name: "address_message",
        parameters: { country: options.country },
      },
    }
    if (options.values) interactive.action.parameters.values = options.values
    if (options.savedAddresses) interactive.action.parameters.saved_addresses = options.savedAddresses
    if (options.header) interactive.header = { type: "text", text: options.header }
    if (options.footer) interactive.footer = { text: options.footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Interactive: Flow ──

  async sendFlow(to: string, body: string, flow: FlowAction, options?: InteractiveOptions): Promise<SendMessageResult> {
    const interactive: any = {
      type: "flow",
      body: { text: body },
      action: {
        name: "flow",
        parameters: {
          flow_id: flow.flowId,
          flow_cta: flow.flowCta,
          flow_message_version: "3",
          mode: flow.mode || "published",
        },
      },
    }
    if (flow.flowToken) interactive.action.parameters.flow_token = flow.flowToken
    if (flow.flowActionData) {
      interactive.action.parameters.flow_action = "navigate"
      interactive.action.parameters.flow_action_payload = {
        screen: flow.navigateScreen || "SCREEN_0",
        data: flow.flowActionData,
      }
    }
    if (options?.header) interactive.header = { type: "text", text: options.header }
    if (options?.footer) interactive.footer = { text: options.footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Interactive: Voice Call ──

  async sendVoiceCall(to: string, body: string, phoneNumber: string, options?: InteractiveOptions): Promise<SendMessageResult> {
    const interactive: any = {
      type: "voice_call",
      body: { text: body },
      action: {
        name: "voice_call",
        parameters: { phone_number: phoneNumber },
      },
    }
    if (options?.header) interactive.header = { type: "text", text: options.header }
    if (options?.footer) interactive.footer = { text: options.footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Interactive: Order Details (Payment) ──

  async sendOrderDetails(to: string, body: string, order: OrderDetailsAction, options?: OrderDetailsOptions): Promise<SendMessageResult> {
    const interactive: any = {
      type: "order_details",
      body: { text: body },
      action: {
        name: "review_and_pay",
        parameters: {
          reference_id: order.referenceId,
          type: order.type || "digital-goods",
          payment_type: order.paymentType,
          payment_configuration: order.paymentConfiguration,
          currency: order.currency,
          total_amount: order.totalAmount,
          order: {
            status: order.order.status,
            items: order.order.items,
            subtotal: order.order.subtotal,
            ...(order.order.catalog_id && { catalog_id: order.order.catalog_id }),
            ...(order.order.tax && { tax: order.order.tax }),
            ...(order.order.shipping && { shipping: order.order.shipping }),
            ...(order.order.discount && { discount: order.order.discount }),
            ...(order.order.expiration && { expiration: order.order.expiration }),
          },
        },
      },
    }
    if (options?.header) interactive.header = { type: "text", text: options.header }
    if (options?.footer) interactive.footer = { text: options.footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Interactive: Order Status ──

  async sendOrderStatus(to: string, body: string, status: OrderStatusAction, options?: OrderStatusOptions): Promise<SendMessageResult> {
    const interactive: any = {
      type: "order_status",
      body: { text: body },
      action: {
        name: "review_order",
        parameters: {
          reference_id: status.referenceId,
          order: {
            status: status.order.status,
            ...(status.order.description && { description: status.order.description }),
          },
        },
      },
    }
    if (options?.header) interactive.header = { type: "text", text: options.header }
    if (options?.footer) interactive.footer = { text: options.footer }
    return this.sendMessage(to, "interactive", { interactive })
  }

  // ── Typing Indicator ──

  async sendTypingIndicator(messageId: string): Promise<any> {
    return this.request(`${this.phoneNumberId}/messages`, {
      body: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      },
    })
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

  async createTemplate(template: TemplateCreateRequest): Promise<TemplateCreateResponse> {
    if (!this.wabaId) throw new Error("wabaId is required for template management")
    return this.request<TemplateCreateResponse>(`${this.wabaId}/message_templates`, { body: template })
  }

  async deleteTemplate(name: string): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for template management")
    return this.request(`${this.wabaId}/message_templates?name=${encodeURIComponent(name)}`, { method: "DELETE" })
  }

  async getTemplate(templateId: string): Promise<any> {
    return this.request(templateId, { method: "GET" })
  }

  async updateTemplate(templateId: string, data: TemplateUpdateRequest): Promise<any> {
    return this.request(templateId, { body: data })
  }

  // ── Template Convenience: Create ──

  async createStandardTemplate(input: StandardTemplateCreateInput): Promise<TemplateCreateResponse> {
    if (!this.wabaId) throw new Error("wabaId is required for template management")
    validateStandardTemplateInput(input, this.validate)
    return this.createTemplate({
      name: input.name,
      language: input.language,
      category: input.category,
      components: buildStandardTemplateComponents(input),
    })
  }

  async createCarouselTemplate(input: CarouselTemplateCreateInput): Promise<TemplateCreateResponse> {
    if (!this.wabaId) throw new Error("wabaId is required for template management")
    validateCarouselTemplateInput(input, this.validate)
    return this.createTemplate({
      name: input.name,
      language: input.language,
      category: "MARKETING",
      components: buildCarouselTemplateComponents(input),
    })
  }

  // ── Template Convenience: Carousel ──

  async sendCarouselTemplate(
    to: string,
    name: string,
    languageCode: string,
    bodyParams: TemplateParameter[],
    cards: CarouselCardInput[],
  ): Promise<SendMessageResult> {
    const components: TemplateComponent[] = [
      { type: "body", parameters: bodyParams } as StandardTemplateComponent,
      {
        type: "carousel",
        cards: cards.map((card, i) => {
          const cardComponents: StandardTemplateComponent[] = []
          const headerType = card.headerType || "image"
          const headerParam: TemplateParameter = headerType === "video"
            ? { type: "video", video: card.header }
            : { type: "image", image: card.header }
          cardComponents.push({ type: "header", parameters: [headerParam] })
          if (card.bodyParams) {
            cardComponents.push({ type: "body", parameters: card.bodyParams })
          }
          if (card.buttons) {
            for (const btn of card.buttons) {
              cardComponents.push({ type: "button", sub_type: btn.sub_type, index: btn.index, parameters: btn.parameters })
            }
          }
          return { card_index: i, components: cardComponents }
        }),
      },
    ]
    return this.sendTemplate(to, name, languageCode, components)
  }

  // ── Template Convenience: Auth OTP ──

  async sendAuthTemplate(
    to: string,
    name: string,
    languageCode: string,
    otp: string,
    buttonType: "url" | "copy_code" = "url",
  ): Promise<SendMessageResult> {
    const components: TemplateComponent[] = [
      { type: "body", parameters: [{ type: "text", text: otp }] } as StandardTemplateComponent,
      { type: "button", sub_type: buttonType, index: 0, parameters: [{ type: "text", text: otp }] } as StandardTemplateComponent,
    ]
    return this.sendTemplate(to, name, languageCode, components)
  }

  // ── Template Convenience: Coupon ──

  async sendCouponTemplate(
    to: string,
    name: string,
    languageCode: string,
    couponCode: string,
    bodyParams: TemplateParameter[],
    expiresAt?: number,
  ): Promise<SendMessageResult> {
    const components: TemplateComponent[] = []
    if (expiresAt !== undefined) {
      components.push({
        type: "limited_time_offer",
        parameters: [{ type: "date_time", date_time: { unix_time: expiresAt } }],
      })
    }
    components.push({ type: "body", parameters: bodyParams } as StandardTemplateComponent)
    components.push({
      type: "button", sub_type: "copy_code", index: 0, parameters: [{ type: "coupon_code", coupon_code: couponCode }],
    } as StandardTemplateComponent)
    return this.sendTemplate(to, name, languageCode, components)
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

  async uploadMediaResumable(appId: string, fileSize: number, mimeType: string, file: Uint8Array | Blob): Promise<MediaUploadResult> {
    // Step 1: Create upload session
    const session = await this.request<{ id: string }>(`${appId}/uploads`, {
      body: { file_length: fileSize, file_type: mimeType, messaging_product: "whatsapp" },
    })

    // Step 2: Upload file data
    const blob = file instanceof Blob ? file : new Blob([file as BlobPart], { type: "application/octet-stream" })
    const result = await this.request<{ h: string }>(`${session.id}`, {
      body: blob,
      headers: { "Content-Type": "application/octet-stream", "file_offset": "0" },
    })

    return { id: result.h }
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

  // ── Two-Step Verification ──

  async setTwoStepPin(pin: string): Promise<{ success: boolean }> {
    return this.request(`${this.phoneNumberId}`, { body: { pin } })
  }

  async removeTwoStepPin(): Promise<{ success: boolean }> {
    return this.request(`${this.phoneNumberId}`, { body: { pin: "" } })
  }

  // ── Block / Unblock ──

  async blockUser(users: string[]): Promise<{ success: boolean }> {
    return this.request(`${this.phoneNumberId}/block`, {
      body: { messaging_product: "whatsapp", block: users },
    })
  }

  async unblockUser(users: string[]): Promise<{ success: boolean }> {
    return this.request(`${this.phoneNumberId}/unblock`, {
      body: { messaging_product: "whatsapp", unblock: users },
    })
  }

  // ── Commerce Settings ──

  async getCommerceSettings(): Promise<CommerceSettings> {
    const result = await this.request<{ data: CommerceSettings[] }>(
      `${this.phoneNumberId}/whatsapp_commerce_settings`,
      { method: "GET" },
    )
    return result.data?.[0] || {}
  }

  async updateCommerceSettings(settings: Partial<CommerceSettings>): Promise<{ success: boolean }> {
    return this.request(`${this.phoneNumberId}/whatsapp_commerce_settings`, {
      body: settings,
    })
  }

  // ── Catalog Management (BM-level) ──

  async listOwnedCatalogs(businessId: string, opts?: { fields?: string[] }): Promise<CatalogListResponse> {
    const path = appendQuery(`${businessId}/owned_product_catalogs`, { fields: opts?.fields?.join(",") })
    return this.request<CatalogListResponse>(path, { method: "GET" })
  }

  async listClientCatalogs(businessId: string, opts?: { fields?: string[] }): Promise<CatalogListResponse> {
    const path = appendQuery(`${businessId}/client_product_catalogs`, { fields: opts?.fields?.join(",") })
    return this.request<CatalogListResponse>(path, { method: "GET" })
  }

  async createCatalog(businessId: string, input: CatalogCreateInput): Promise<{ id: string }> {
    return this.request<{ id: string }>(`${businessId}/owned_product_catalogs`, { body: input })
  }

  async getCatalog(catalogId: string, fields?: string[]): Promise<Catalog> {
    const path = appendQuery(catalogId, { fields: fields?.join(",") })
    return this.request<Catalog>(path, { method: "GET" })
  }

  async deleteCatalog(catalogId: string): Promise<{ success: boolean }> {
    return this.request(catalogId, { method: "DELETE" })
  }

  // ── Product Management (catalog-level) ──

  async createProduct(catalogId: string, input: ProductCreateInput): Promise<{ id: string }> {
    validateProductInput(input, this.validate)
    return this.request<{ id: string }>(`${catalogId}/products`, { body: input })
  }

  async getProduct(productId: string, fields?: string[]): Promise<Product> {
    const path = appendQuery(productId, { fields: fields?.join(",") })
    return this.request<Product>(path, { method: "GET" })
  }

  async updateProduct(productId: string, patch: ProductUpdateInput): Promise<{ success: boolean }> {
    validateProductPatch(patch, this.validate)
    return this.request(productId, { body: patch })
  }

  async deleteProduct(productId: string): Promise<{ success: boolean }> {
    return this.request(productId, { method: "DELETE" })
  }

  async listProducts(catalogId: string, opts?: ProductListOptions): Promise<ProductListResponse> {
    const path = appendQuery(`${catalogId}/products`, {
      fields: opts?.fields?.join(","),
      limit: opts?.limit?.toString(),
      after: opts?.after,
      before: opts?.before,
      filter: opts?.filter ? JSON.stringify(opts.filter) : undefined,
    })
    return this.request<ProductListResponse>(path, { method: "GET" })
  }

  // Meta v25: the legacy `/batch` endpoint with form-urlencoded `requests=<JSON>`
  // is the shape that worked end-to-end in our smoke runs. The newer documented
  // `/items_batch` endpoint returned "Can not find required field id" for every
  // payload variant tested (verified against catalog 2826724194252749 in 2026-04).
  // Revisit if Meta deprecates `/batch` or fixes `/items_batch`.
  async batchProducts(
    catalogId: string,
    requests: ProductBatchRequest[],
    opts?: { allowUpsert?: boolean },
  ): Promise<ProductBatchResponse> {
    if (requests.length < 1) {
      throw new ValidationError(`batch must have at least 1 request (got ${requests.length})`, "requests", 1)
    }
    if (requests.length > 5000) {
      throw new ValidationError(`batch can have at most 5000 requests (got ${requests.length})`, "requests", 5000)
    }

    const body = new URLSearchParams()
    body.set("requests", JSON.stringify(requests))
    if (opts?.allowUpsert) body.set("allow_upsert", "true")

    const result = await this.request<ProductBatchResponse>(`${catalogId}/batch`, { body })

    // Meta returns HTTP 200 with no handles when the payload is rejected. Surface
    // this as an error regardless of whether `validation_status` is populated:
    // empty/missing `errors` arrays still mean the batch never queued.
    if (!result.handles?.length) {
      const rejected = result.validation_status?.length ?? 0
      const detail = result.validation_status
        ? JSON.stringify(result.validation_status)
        : "no validation_status returned"
      throw new WhatsAppError({
        message: `batch produced no handles (${rejected} item(s) rejected)`,
        code: 0,
        title: "batch_validation_failed",
        httpStatus: 200,
        details: detail,
        category: "parameter",
        retryHint: "fix_and_retry",
      })
    }
    return result
  }

  async getBatchStatus(catalogId: string, handle: string): Promise<ProductBatchStatus> {
    const path = appendQuery(`${catalogId}/check_batch_request_status`, { handle })
    const result = await this.request<{ data: ProductBatchStatus[] }>(path, { method: "GET" })
    if (!result.data || result.data.length === 0) {
      throw new WhatsAppError({
        message: `no batch status returned for handle "${handle}" (handle may be invalid or expired)`,
        code: 0,
        title: "empty_batch_status",
        httpStatus: 200,
        category: "parameter",
        retryHint: "do_not_retry",
      })
    }
    return result.data[0]
  }

  // ── Health Status ──

  async getHealthStatus(): Promise<HealthStatusResponse> {
    if (!this.wabaId) throw new Error("wabaId is required for health status")
    return this.request<HealthStatusResponse>(`${this.wabaId}?fields=health_status`, { method: "GET" })
  }

  // ── List Phone Numbers ──

  async listPhoneNumbers(): Promise<{ data: PhoneNumberEntry[] }> {
    if (!this.wabaId) throw new Error("wabaId is required for listing phone numbers")
    return this.request(`${this.wabaId}/phone_numbers`, { method: "GET" })
  }

  // ── QR Code Management ──

  async createQR(message: string, format: "png" | "svg" = "png"): Promise<QRCode> {
    return this.request<QRCode>(`${this.phoneNumberId}/message_qrdls`, {
      body: { prefilled_message: message, generate_qr_image: format },
    })
  }

  async listQRCodes(): Promise<{ data: QRCode[] }> {
    return this.request(`${this.phoneNumberId}/message_qrdls`, { method: "GET" })
  }

  async updateQR(codeId: string, message: string): Promise<QRCode> {
    return this.request<QRCode>(`${this.phoneNumberId}/message_qrdls/${codeId}`, {
      body: { prefilled_message: message },
    })
  }

  async deleteQR(codeId: string): Promise<{ success: boolean }> {
    return this.request(`${this.phoneNumberId}/message_qrdls/${codeId}`, { method: "DELETE" })
  }

  // ── Flows Management ──

  async createFlow(name: string, categories: string[]): Promise<{ id: string }> {
    if (!this.wabaId) throw new Error("wabaId is required for flow management")
    return this.request(`${this.wabaId}/flows`, {
      body: { name, categories },
    })
  }

  async listFlows(): Promise<{ data: FlowInfo[] }> {
    if (!this.wabaId) throw new Error("wabaId is required for flow management")
    return this.request(`${this.wabaId}/flows`, { method: "GET" })
  }

  async getFlow(flowId: string): Promise<FlowInfo> {
    return this.request<FlowInfo>(flowId, { method: "GET" })
  }

  async updateFlow(flowId: string, data: { name?: string; categories?: string[] }): Promise<{ success: boolean }> {
    return this.request(flowId, { body: data })
  }

  async publishFlow(flowId: string): Promise<{ success: boolean }> {
    return this.request(`${flowId}/publish`, { body: {} })
  }

  async deprecateFlow(flowId: string): Promise<{ success: boolean }> {
    return this.request(`${flowId}/deprecate`, { body: {} })
  }

  async deleteFlow(flowId: string): Promise<{ success: boolean }> {
    return this.request(flowId, { method: "DELETE" })
  }

  async getFlowAssets(flowId: string): Promise<{ data: any[] }> {
    return this.request(`${flowId}/assets`, { method: "GET" })
  }

  async updateFlowJSON(flowId: string, json: string): Promise<{ success: boolean; validation_errors?: any[] }> {
    const form = new FormData()
    form.append("file", new Blob([json], { type: "application/json" }), "flow.json")
    form.append("name", "flow.json")
    form.append("asset_type", "FLOW_JSON")
    return this.request(`${flowId}/assets`, { body: form })
  }

  // ── Analytics ──

  async getAnalytics(
    start: number, end: number,
    granularity: "HALF_HOUR" | "DAY" | "MONTH" = "DAY",
  ): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for analytics")
    const fields = `analytics.start(${start}).end(${end}).granularity(${granularity}).phone_numbers([]).country_codes([])`
    return this.request(`${this.wabaId}?fields=${fields}`, { method: "GET" })
  }

  async getConversationAnalytics(
    start: number, end: number,
    granularity: "HALF_HOUR" | "DAILY" | "MONTHLY" = "DAILY",
  ): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for analytics")
    const fields = `conversation_analytics.start(${start}).end(${end}).granularity(${granularity}).conversation_directions([]).conversation_types([]).dimensions([])`
    return this.request(`${this.wabaId}?fields=${fields}`, { method: "GET" })
  }

  async getTemplateAnalytics(
    start: number, end: number,
    templateIds?: string[],
  ): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for analytics")
    let fields = `template_analytics.start(${start}).end(${end})`
    if (templateIds?.length) fields += `.template_ids([${templateIds.join(",")}])`
    return this.request(`${this.wabaId}?fields=${fields}`, { method: "GET" })
  }

  async getTemplatePerformance(): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for analytics")
    return this.request(`${this.wabaId}/template_performance_metrics`, { method: "GET" })
  }

  async getPricingAnalytics(
    start: number, end: number,
    granularity: "HALF_HOUR" | "DAY" | "MONTH" = "DAY",
  ): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for analytics")
    const fields = `pricing_analytics.start(${start}).end(${end}).granularity(${granularity})`
    return this.request(`${this.wabaId}?fields=${fields}`, { method: "GET" })
  }

  async getCallAnalytics(
    start: number, end: number,
    granularity: "HALF_HOUR" | "DAY" | "MONTH" = "DAY",
  ): Promise<any> {
    if (!this.wabaId) throw new Error("wabaId is required for analytics")
    const fields = `call_analytics.start(${start}).end(${end}).granularity(${granularity})`
    return this.request(`${this.wabaId}?fields=${fields}`, { method: "GET" })
  }

  // ── Calling API (WebRTC) ──

  async initiateCall(to: string, sdpOffer: string): Promise<any> {
    return this.request(`${this.phoneNumberId}/calls`, {
      body: {
        messaging_product: "whatsapp",
        to,
        type: "voice",
        voice: { sdp: sdpOffer },
      },
    })
  }

  async acceptCall(callId: string, sdpAnswer: string): Promise<any> {
    return this.request(`${callId}`, {
      body: { action: "accept", sdp: sdpAnswer },
    })
  }

  async rejectCall(callId: string): Promise<any> {
    return this.request(`${callId}`, {
      body: { action: "reject" },
    })
  }

  async terminateCall(callId: string): Promise<any> {
    return this.request(`${callId}`, {
      body: { action: "terminate" },
    })
  }

  // ── Broadcast ──

  async broadcastTemplate(
    recipients: string[],
    templateName: string,
    languageCode: string,
    components?: TemplateComponent[],
    options?: { batchSize?: number; delayMs?: number },
  ): Promise<BroadcastResult> {
    const batchSize = options?.batchSize ?? 50
    const delayMs = options?.delayMs ?? 100
    const succeeded: BroadcastResult["succeeded"] = []
    const failed: BroadcastResult["failed"] = []

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(to => this.sendTemplate(to, templateName, languageCode, components)),
      )
      for (let j = 0; j < results.length; j++) {
        const r = results[j]
        const to = batch[j]
        if (r.status === "fulfilled") {
          succeeded.push({ to, result: r.value })
        } else {
          failed.push({ to, error: r.reason })
        }
      }
      if (i + batchSize < recipients.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    return { succeeded, failed }
  }

  // ── Webhook (Static) ──────────────────────────────────────────────────

  static verifyWebhook(query: VerifyQuery, verifyToken: string): string {
    return verifyWebhook(query, verifyToken)
  }

  static parseWebhook(body: unknown): WebhookEvent[] {
    return parseWebhook(body)
  }

  static validateSignature(rawBody: string | Buffer, signature: string, appSecret: string): boolean {
    return validateSignature(rawBody, signature, appSecret)
  }

  static parseWebhookWithSignature(rawBody: string | Buffer, signature: string, appSecret: string): WebhookEvent[] {
    return parseWebhookWithSignature(rawBody, signature, appSecret)
  }
}

// ── Template Build Helpers (private to module) ─────────────────────────────

// Structural checks always run (would produce malformed JSON otherwise);
// char-limit checks only when `extended` is true (gated by client's `validate` flag).
function validateStandardTemplateInput(input: StandardTemplateCreateInput, extended: boolean): void {
  if (!input.body || !input.body.text || input.body.text.length === 0) {
    throw new ValidationError("template body is required and cannot be empty", "body", 0)
  }
  if (!extended) return

  if (input.body.text.length > 1024) {
    throw new ValidationError(`template body exceeds 1024 chars (got ${input.body.text.length})`, "body", 1024)
  }
  if (input.header?.type === "text" && input.header.text.length > 60) {
    throw new ValidationError(`text header exceeds 60 chars (got ${input.header.text.length})`, "header.text", 60)
  }
  if (input.footer && input.footer.length > 60) {
    throw new ValidationError(`footer exceeds 60 chars (got ${input.footer.length})`, "footer", 60)
  }
}

function buildStandardTemplateComponents(input: StandardTemplateCreateInput): any[] {
  const components: any[] = []
  if (input.header) components.push(buildHeaderComponent(input.header))
  components.push(buildBodyComponent(input.body))
  if (input.footer) components.push({ type: "footer", text: input.footer })
  if (input.buttons && input.buttons.length > 0) {
    components.push({ type: "buttons", buttons: input.buttons.map(buildStandardButton) })
  }
  return components
}

function buildHeaderComponent(h: StandardHeaderInput): any {
  switch (h.type) {
    case "text": {
      const c: any = { type: "header", format: "text", text: h.text }
      if (h.example !== undefined) c.example = { header_text: [h.example] }
      return c
    }
    case "image":
    case "video":
    case "document":
      return { type: "header", format: h.type, example: { header_handle: [h.handle] } }
    default: {
      const _exhaustive: never = h
      throw new Error(`unsupported header type: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

function buildBodyComponent(b: { text: string; example?: string[] }): any {
  const c: any = { type: "body", text: b.text }
  if (b.example && b.example.length > 0) c.example = { body_text: [b.example] }
  return c
}

function buildStandardButton(b: StandardButtonInput): any {
  switch (b.type) {
    case "url": {
      const out: any = { type: "url", text: b.text, url: b.url }
      if (b.example !== undefined) out.example = [b.example]
      return out
    }
    case "phone_number":
      return { type: "phone_number", text: b.text, phone_number: b.phone_number }
    case "quick_reply":
      return { type: "quick_reply", text: b.text }
    case "copy_code":
      return { type: "copy_code", example: b.example }
    default: {
      const _exhaustive: never = b
      throw new Error(`unsupported standard button type: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

function validateCarouselTemplateInput(input: CarouselTemplateCreateInput, extended: boolean): void {
  if (input.cards.length < 2) {
    throw new ValidationError(`carousel must have at least 2 cards (got ${input.cards.length})`, "cards", 2)
  }
  if (input.cards.length > 10) {
    throw new ValidationError(`carousel can have at most 10 cards (got ${input.cards.length})`, "cards", 10)
  }
  if (!input.body || !input.body.text || input.body.text.length === 0) {
    throw new ValidationError("carousel body text is required and cannot be empty", "body", 0)
  }

  const ref = input.cards[0]
  for (let i = 1; i < input.cards.length; i++) {
    if (!sameCardStructure(ref, input.cards[i])) {
      throw new ValidationError(`all cards must have the same components (mismatch at card ${i})`, "cards", i)
    }
  }

  if (!extended) return

  if (input.body.text.length > 1024) {
    throw new ValidationError(`carousel body exceeds 1024 chars (got ${input.body.text.length})`, "body", 1024)
  }
  for (let i = 0; i < input.cards.length; i++) {
    const card = input.cards[i]
    if (card.body && card.body.text.length > 160) {
      throw new ValidationError(`card[${i}] body exceeds 160 chars (got ${card.body.text.length})`, "card.body", 160)
    }
  }
}

function sameCardStructure(a: CarouselCardCreateInput, b: CarouselCardCreateInput): boolean {
  if (a.header.format !== b.header.format) return false
  if (Boolean(a.body) !== Boolean(b.body)) return false
  const aBtns = a.buttons || []
  const bBtns = b.buttons || []
  if (aBtns.length !== bBtns.length) return false
  for (let i = 0; i < aBtns.length; i++) {
    if (aBtns[i].type !== bBtns[i].type) return false
  }
  return true
}

function buildCarouselTemplateComponents(input: CarouselTemplateCreateInput): any[] {
  return [
    buildBodyComponent(input.body),
    {
      type: "carousel",
      cards: input.cards.map(card => ({ components: buildCarouselCardComponents(card) })),
    },
  ]
}

function buildCarouselCardComponents(card: CarouselCardCreateInput): any[] {
  const comps: any[] = [
    { type: "header", format: card.header.format, example: { header_handle: [card.header.handle] } },
  ]
  if (card.body) comps.push(buildBodyComponent(card.body))
  if (card.buttons && card.buttons.length > 0) {
    comps.push({ type: "buttons", buttons: card.buttons.map(buildCarouselCardButton) })
  }
  return comps
}

function buildCarouselCardButton(b: CarouselCardButtonInput): any {
  switch (b.type) {
    case "url": {
      const out: any = { type: "url", text: b.text, url: b.url }
      if (b.example !== undefined) out.example = [b.example]
      return out
    }
    case "phone_number":
      return { type: "phone_number", text: b.text, phone_number: b.phone_number }
    case "quick_reply":
      return { type: "quick_reply", text: b.text }
    default: {
      const _exhaustive: never = b
      throw new Error(`unsupported carousel card button type: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

// ── Catalog/Product Helpers (private to module) ────────────────────────────

function appendQuery(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, v)
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

// `retailer_id`, `url`, and `image_url` are structural: empty would build an
// unidentifiable item or one Meta will reject as missing required fields.
// Numeric/format checks are gated by the `validate` flag.
function validateProductInput(input: ProductCreateInput, extended: boolean): void {
  if (!input.retailer_id) {
    throw new ValidationError("product retailer_id is required and cannot be empty", "retailer_id", 0)
  }
  if (!input.url) {
    throw new ValidationError("product url is required and cannot be empty", "url", 0)
  }
  if (!input.image_url) {
    throw new ValidationError("product image_url is required and cannot be empty", "image_url", 0)
  }
  if (!extended) return

  if (typeof input.price !== "number" || input.price < 0) {
    throw new ValidationError(`product price must be a non-negative integer (got ${input.price})`, "price", 0)
  }
  if (!input.currency || !/^[A-Z]{3}$/.test(input.currency)) {
    throw new ValidationError(`product currency must be ISO 4217 (3 uppercase letters), got "${input.currency}"`, "currency", 3)
  }
  if (!/^https?:\/\//.test(input.image_url)) {
    throw new ValidationError(`product image_url must be http(s), got "${input.image_url}"`, "image_url", 0)
  }
  if (!/^https?:\/\//.test(input.url)) {
    throw new ValidationError(`product url must be http(s), got "${input.url}"`, "url", 0)
  }
}

function validateProductPatch(patch: ProductUpdateInput, extended: boolean): void {
  if (!extended) return
  if (patch.price !== undefined && (typeof patch.price !== "number" || patch.price < 0)) {
    throw new ValidationError(`product price must be a non-negative integer (got ${patch.price})`, "price", 0)
  }
  if (patch.currency !== undefined && !/^[A-Z]{3}$/.test(patch.currency)) {
    throw new ValidationError(`product currency must be ISO 4217 (3 uppercase letters), got "${patch.currency}"`, "currency", 3)
  }
  if (patch.image_url !== undefined && !/^https?:\/\//.test(patch.image_url)) {
    throw new ValidationError(`product image_url must be http(s), got "${patch.image_url}"`, "image_url", 0)
  }
  if (patch.url !== undefined && !/^https?:\/\//.test(patch.url)) {
    throw new ValidationError(`product url must be http(s), got "${patch.url}"`, "url", 0)
  }
}
