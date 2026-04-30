// ---------------------------------------------------------------------------
// @saimonventura/waba — WhatsApp Cloud API v25.0 Types
// Types-only file. No runtime code.
// ---------------------------------------------------------------------------

// ── Config ──────────────────────────────────────────────────────────────────

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion?: string;
  wabaId?: string;
  validate?: boolean;
}

// ── Media ───────────────────────────────────────────────────────────────────

export type MediaSource = { url: string } | { id: string };

// ── Send Options ────────────────────────────────────────────────────────────

export interface SendMessageOptions {
  replyTo?: string;
  previewUrl?: boolean;
}

export interface InteractiveOptions {
  header?: string;
  footer?: string;
}

// ── Interactive Components ──────────────────────────────────────────────────

export interface Button {
  id: string;
  title: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface CTAAction {
  text: string;
  url: string;
}

// ── Commerce / Catalog ────────────────────────────────────────────────────

export interface ProductItem {
  product_retailer_id: string;
}

export interface ProductSection {
  title: string;
  product_items: ProductItem[];
}

export interface OrderProductItem {
  product_retailer_id: string;
  quantity: number;
  item_price: number;
  currency: string;
}

export interface Order {
  catalog_id: string;
  text?: string;
  product_items: OrderProductItem[];
}

// ── Location ────────────────────────────────────────────────────────────────

export interface LocationData {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

// ── Contacts ────────────────────────────────────────────────────────────────

export interface ContactName {
  formatted_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  prefix?: string;
}

export interface ContactPhone {
  phone: string;
  type?: string;
}

export interface ContactEmail {
  email: string;
  type?: string;
}

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  type?: string;
}

export interface ContactOrg {
  company?: string;
}

export interface ContactUrl {
  url: string;
  type?: string;
}

export interface ContactData {
  name: ContactName;
  phones?: ContactPhone[];
  emails?: ContactEmail[];
  addresses?: ContactAddress[];
  org?: ContactOrg;
  urls?: ContactUrl[];
}

// ── Address Message ────────────────────────────────────────────────────

export interface AddressValues {
  name?: string;
  phoneNumber?: string;
  inPinCode?: string;
  houseNumber?: string;
  floorNumber?: string;
  towerNumber?: string;
  buildingName?: string;
  address?: string;
  landmarkArea?: string;
  city?: string;
  state?: string;
  [key: string]: string | undefined;
}

export interface SavedAddress {
  id: string;
  address: Partial<AddressValues>;
}

export interface AddressMessageOptions {
  header?: string;
  footer?: string;
  country: string;
  values?: AddressValues;
  savedAddresses?: SavedAddress[];
}

// ── Payment / Order ──────────────────────────────────────────────────

export interface OrderAmount {
  value: number    // integer in minor units (e.g. 2990 = R$29.90)
  offset: number   // 100 for BRL (2 decimal places)
}

export interface OrderDetailItem {
  retailer_id: string
  name: string
  amount: OrderAmount
  quantity: number
  sale_amount?: OrderAmount
  country_of_origin?: string
  importer_name?: string
  importer_address?: string
}

export interface OrderDetailOrder {
  status: "pending" | "processing" | "completed" | "failed" | string
  catalog_id?: string
  items: OrderDetailItem[]
  subtotal: OrderAmount
  tax?: OrderAmount
  shipping?: OrderAmount
  discount?: OrderAmount
  expiration?: {
    timestamp: string
    description?: string
  }
}

export interface OrderDetailsAction {
  referenceId: string
  type?: "digital-goods" | "physical-goods" | string
  paymentType: "br" | "upi" | string
  paymentConfiguration: string
  currency: string
  totalAmount: OrderAmount
  order: OrderDetailOrder
}

export interface OrderDetailsOptions {
  header?: string
  footer?: string
}

export type OrderStatusValue = "pending" | "processing" | "completed" | "failed" | string

export interface OrderStatusAction {
  referenceId: string
  order: {
    status: OrderStatusValue
    description?: string
  }
}

export interface OrderStatusOptions {
  header?: string
  footer?: string
}

// ── Flow ──────────────────────────────────────────────────────────────

export interface FlowAction {
  flowId: string;
  flowCta: string;
  flowToken?: string;
  flowActionData?: Record<string, any>;
  mode?: "draft" | "published";
  navigateScreen?: string;
}

// ── Templates ───────────────────────────────────────────────────────────────

export type TemplateParameter =
  | { type: "text"; text: string }
  | { type: "image"; image: MediaSource }
  | { type: "video"; video: MediaSource }
  | { type: "document"; document: MediaSource }
  | { type: "payload"; payload: string }
  | { type: "currency"; currency: { fallback_value: string; code: string; amount_1000: number } }
  | { type: "date_time"; date_time: { fallback_value?: string; unix_time: number } }
  | { type: "coupon_code"; coupon_code: string };

export interface StandardTemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: string;
  index?: number;
  parameters: TemplateParameter[];
}

export interface CarouselCard {
  card_index: number
  components: StandardTemplateComponent[]
}

export interface CarouselTemplateComponent {
  type: "carousel"
  cards: CarouselCard[]
}

export interface LTOTemplateComponent {
  type: "limited_time_offer"
  parameters: [{ type: "date_time"; date_time: { fallback_value?: string; unix_time: number } }]
}

export type TemplateComponent = StandardTemplateComponent | CarouselTemplateComponent | LTOTemplateComponent

export interface CarouselCardInput {
  header: MediaSource
  headerType?: "image" | "video"
  bodyParams?: TemplateParameter[]
  buttons?: CarouselCardButton[]
}

export interface CarouselCardButton {
  sub_type: "quick_reply" | "url" | "phone_number"
  index: number
  parameters: TemplateParameter[]
}

export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION"

export type TemplateStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" | "DISABLED" | "IN_APPEAL"

export interface TemplateCreateResponse {
  id: string
  status: TemplateStatus
  category: TemplateCategory
}

export interface TemplateCreateRequest {
  name: string;
  category: TemplateCategory;
  language: string;
  components: any[];
}

export interface TemplateUpdateRequest {
  components?: any[]
  category?: TemplateCategory
}

// ── Template Creation Helpers (typed inputs for create*) ─────────────────────
// Auth templates have a different payload shape — use sendAuthTemplate / a future
// createAuthTemplate helper, not these inputs.

export type StandardHeaderInput =
  | { type: "text"; text: string; example?: string }
  | { type: "image"; handle: string }
  | { type: "video"; handle: string }
  | { type: "document"; handle: string }

export type StandardButtonInput =
  | { type: "quick_reply"; text: string }
  | { type: "url"; text: string; url: string; example?: string }
  | { type: "phone_number"; text: string; phone_number: string }
  | { type: "copy_code"; example: string }

export interface StandardTemplateCreateInput {
  name: string
  language: string
  category: "MARKETING" | "UTILITY"
  header?: StandardHeaderInput
  body: { text: string; example?: string[] }
  footer?: string
  buttons?: StandardButtonInput[]
}

export type CarouselCardHeaderInput =
  | { format: "image"; handle: string }
  | { format: "video"; handle: string }

export type CarouselCardButtonInput =
  | { type: "quick_reply"; text: string }
  | { type: "url"; text: string; url: string; example?: string }
  | { type: "phone_number"; text: string; phone_number: string }

export interface CarouselCardCreateInput {
  header: CarouselCardHeaderInput
  body?: { text: string; example?: string[] }
  buttons?: CarouselCardButtonInput[]
}

export interface CarouselTemplateCreateInput {
  name: string
  language: string
  body: { text: string; example?: string[] }
  cards: CarouselCardCreateInput[]
}

// ── Media Results ───────────────────────────────────────────────────────────

export interface MediaUploadResult {
  id: string;
}

export interface MediaUrlResult {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
  messaging_product: string;
}

// ── Business Profile ────────────────────────────────────────────────────────

export interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
  profile_picture_url?: string;
  messaging_product?: string;
}

// ── Phone Info ──────────────────────────────────────────────────────────────

export interface PhoneInfo {
  verified_name?: string;
  code_verification_status?: string;
  display_phone_number?: string;
  quality_rating?: string;
  platform_type?: string;
  throughput?: { level: string };
  id?: string;
}

// ── Commerce Settings ────────────────────────────────────────────────────

export interface CommerceSettings {
  is_cart_enabled?: boolean
  is_catalog_visible?: boolean
  id?: string
}

// ── Catalog & Product Management ─────────────────────────────────────────

export type CatalogVertical =
  | "commerce"
  | "destinations"
  | "flights"
  | "home_listings"
  | "hotels"
  | "media_title"
  | "offline_commerce"
  | "ticketed_experiences"
  | "transactable_items"
  | "vehicles"
  | (string & {})

export interface Catalog {
  id: string
  name: string
  vertical?: CatalogVertical
  product_count?: number
}

export interface CatalogCreateInput {
  name: string
  vertical?: CatalogVertical
}

export interface CatalogListResponse {
  data: Catalog[]
  paging?: { cursors?: { before?: string; after?: string }; next?: string; previous?: string }
}

export type ItemAvailability =
  | "in stock"
  | "out of stock"
  | "preorder"
  | "available for order"
  | "discontinued"
  | (string & {})

export type ItemCondition = "new" | "refurbished" | "used" | "cpo" | (string & {})

// `price` and `sale_price` are integers in the smallest currency unit
// (e.g. 990 for R$ 9,90 with BRL = 990 cents). The Meta GET response, however,
// returns `price` as a localized formatted STRING (e.g. "R$14,90") — see Product below.
export interface ProductCreateInput {
  retailer_id: string
  name: string
  description: string
  image_url: string
  price: number
  currency: string
  url: string                                          // required by Meta
  availability?: ItemAvailability
  condition?: ItemCondition
  brand?: string
  category?: string
  additional_image_urls?: string[]
  gtin?: string
  mpn?: string
  sale_price?: number
  sale_price_start_date?: string
  sale_price_end_date?: string
}

// `retailer_id` is the path key (immutable) and is not patchable through this endpoint.
export type ProductUpdateInput = Partial<Omit<ProductCreateInput, "retailer_id">>

// Distinct from `ProductCreateInput`: Meta's GET returns `price` as a formatted string
// like "R$14,90". Do not perform arithmetic on `Product.price` — fetch the raw integer
// via the `price_amount` field if needed (use `getProduct(id, ["price_amount"])`).
export interface Product {
  id: string
  retailer_id: string
  name?: string
  description?: string
  image_url?: string
  price?: string
  currency?: string
  url?: string
  availability?: ItemAvailability
  condition?: ItemCondition
  brand?: string
  category?: string
  additional_image_urls?: string[]
  gtin?: string
  mpn?: string
  sale_price?: string
  sale_price_start_date?: string
  sale_price_end_date?: string
  retailer_product_group_id?: string
  visibility?: "published" | "staging"
  review_status?: "pending" | "approved" | "rejected" | "outdated"
}

export interface ProductListOptions {
  fields?: string[]
  limit?: number
  after?: string
  before?: string
  filter?: Record<string, unknown>
}

export interface ProductListResponse {
  data: Product[]
  paging?: { cursors?: { before?: string; after?: string }; next?: string; previous?: string }
}

export type ProductBatchMethod = "CREATE" | "UPDATE" | "DELETE"

// Discriminated by `method`: CREATE requires full data, UPDATE takes a partial,
// DELETE takes nothing besides the retailer_id.
export type ProductBatchRequest =
  | { method: "CREATE"; retailer_id: string; data: ProductCreateInput }
  | { method: "UPDATE"; retailer_id: string; data: ProductUpdateInput }
  | { method: "DELETE"; retailer_id: string }

export interface ProductBatchResponse {
  handles?: string[]
  // `errors` is optional: Meta has been observed returning entries with only a
  // `retailer_id` and no `errors` key (or with an empty array). Treat absence of
  // `handles` as the authoritative failure signal — see `batchProducts`.
  validation_status?: Array<{
    retailer_id?: string
    errors?: Array<{ message: string }>
  }>
}

// Meta has been observed to return "started" for queued-but-running batches even
// though the public docs list "queued" / "in_progress". Both surface here so
// `switch`-exhaustiveness on `status` keeps working for new variants.
export type ProductBatchStatusValue =
  | "queued"
  | "started"
  | "in_progress"
  | "finished"
  | "errored"
  | (string & {})

export interface ProductBatchStatus {
  handle: string
  status: ProductBatchStatusValue
  errors?: Array<{ message: string; retailer_id?: string; line?: number }>
  warnings?: Array<{ message: string; id?: string; line?: number }>
  errors_total_count?: number
  ids_of_invalid_requests?: number[]
}

// ── Health Status ────────────────────────────────────────────────────────

export interface HealthStatusEntity {
  entity_type: string
  id: string
  can_send_message: "AVAILABLE" | "LIMITED" | "BLOCKED"
}

export interface HealthStatusResponse {
  health_status: {
    can_send_message: "AVAILABLE" | "LIMITED" | "BLOCKED"
    entities: HealthStatusEntity[]
  }
}

// ── Phone Number Entry ──────────────────────────────────────────────────

export interface PhoneNumberEntry {
  id: string
  display_phone_number: string
  verified_name: string
  quality_rating: string
}

// ── QR Code ─────────────────────────────────────────────────────────────

export interface QRCode {
  code: string
  prefilled_message: string
  deep_link_url: string
  qr_image_url?: string
}

// ── Flow Info ───────────────────────────────────────────────────────────

export interface FlowInfo {
  id: string
  name: string
  status: "DRAFT" | "PUBLISHED" | "DEPRECATED" | "BLOCKED" | "THROTTLED"
  categories: string[]
  validation_errors?: any[]
}

// ── Send Result ─────────────────────────────────────────────────────────────

export interface SendMessageResult {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

// ── Broadcast Result ────────────────────────────────────────────────────

export interface BroadcastResult {
  succeeded: { to: string; result: SendMessageResult }[]
  failed: { to: string; error: Error }[]
}

// ── Webhook: Inbound ────────────────────────────────────────────────────────

export interface Metadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface Contact {
  profile: { name: string };
  wa_id: string;
}

export interface MediaInfo {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

export interface InteractiveReply {
  type: string;
  button_reply?: { id: string; title: string };
  list_reply?: { id: string; title: string; description?: string };
  nfm_reply?: { response_json: string; body: string; name: string };
}

export interface InboundMessageBase {
  from: string;
  id: string;
  timestamp: string;
}

export type InboundMessage =
  | ({ type: "text"; text: { body: string } } & InboundMessageBase)
  | ({ type: "image"; image: MediaInfo } & InboundMessageBase)
  | ({ type: "audio"; audio: MediaInfo } & InboundMessageBase)
  | ({ type: "video"; video: MediaInfo } & InboundMessageBase)
  | ({
      type: "document";
      document: MediaInfo & { filename?: string };
    } & InboundMessageBase)
  | ({
      type: "sticker";
      sticker: { id: string; mime_type: string; animated?: boolean };
    } & InboundMessageBase)
  | ({
      type: "location";
      location: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
      };
    } & InboundMessageBase)
  | ({ type: "contacts"; contacts: ContactData[] } & InboundMessageBase)
  | ({ type: "interactive"; interactive: InteractiveReply } & InboundMessageBase)
  | ({
      type: "reaction";
      reaction: { message_id: string; emoji: string };
    } & InboundMessageBase)
  | ({
      type: "button";
      button: { text: string; payload: string };
    } & InboundMessageBase)
  | ({ type: "order"; order: Order } & InboundMessageBase)
  | ({ type: "system"; system: any } & InboundMessageBase)
  | ({ type: "referral"; referral: any } & InboundMessageBase)
  | ({ type: string } & InboundMessageBase);

// ── Webhook: Statuses ───────────────────────────────────────────────────────

export interface WebhookError {
  code: number;
  title: string;
  message?: string;
  error_data?: { details?: string };
}

export interface StatusUpdate {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: { type: string };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: WebhookError[];
}

// ── Webhook: Events ─────────────────────────────────────────────────────────

export type WebhookEvent =
  | {
      type: "message";
      message: InboundMessage;
      contact: Contact;
      metadata: Metadata;
    }
  | { type: "status"; status: StatusUpdate; metadata: Metadata }
  | { type: "error"; errors: WebhookError[]; metadata: Metadata };

// ── Webhook: Raw Payload ────────────────────────────────────────────────────

export interface RawWebhookPayload {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: Metadata;
        contacts?: Contact[];
        messages?: any[];
        statuses?: any[];
        errors?: WebhookError[];
      };
      field: string;
    }[];
  }[];
}
