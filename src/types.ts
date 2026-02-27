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
  | { type: "payload"; payload: string };

export interface TemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: string;
  index?: number;
  parameters: TemplateParameter[];
}

export interface TemplateCreateRequest {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  components: any[];
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
