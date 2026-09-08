export type WhatsAppMode = 'HYBRID' | 'CLOUD_API' | 'CLICK_TO_CHAT';

export enum WhatsAppTemplateType {
  BOOKING_REQUEST = 'BOOKING_REQUEST',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  PAYMENT_INSTRUCTIONS = 'PAYMENT_INSTRUCTIONS',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  WEDDING_QUOTE_REQUEST = 'WEDDING_QUOTE_REQUEST',
}

export interface WhatsAppConfig {
  mode: WhatsAppMode;
  businessPhoneNumber: string;
  cloudApiToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  apiVersion: string;
  templates: {
    [WhatsAppTemplateType.BOOKING_REQUEST]?: string;
    [WhatsAppTemplateType.BOOKING_CONFIRMED]?: string;
    [WhatsAppTemplateType.PAYMENT_INSTRUCTIONS]?: string;
    [WhatsAppTemplateType.PAYMENT_RECEIVED]?: string;
    [WhatsAppTemplateType.BOOKING_CANCELLED]?: string;
    [WhatsAppTemplateType.WEDDING_QUOTE_REQUEST]?: string;
  };
}

export interface WhatsAppMessagePayload {
  messaging_product?: string;
  recipient_type?: string;
  to: string; // E.164 without +, e.g. 919322759343
  type: 'text' | 'template' | 'image';
  text?: {
    preview_url?: boolean;
    body: string;
  };
  image?: {
    id?: string;
    link?: string;
    caption?: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: 'header' | 'body' | 'button';
      sub_type?: string;
      index?: string;
      parameters: Array<{
        type: 'text' | 'currency' | 'date_time';
        text?: string;
        currency?: {
          fallback_value: string;
          code: string;
          amount_1000: number;
        };
      }>;
    }>;
  };
}

export interface WhatsAppCloudApiResponse {
  messaging_product: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
    message_status?: string;
  }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export class WhatsAppStatusDto {
  mode: WhatsAppMode;
  configured: boolean;
  businessPhoneNumber: string;
  apiVersion: string;
  phoneNumberIdConfigured: boolean;
  tokenConfigured: boolean;
  activeTemplates: Record<string, string>;
}

/**
 * Normalizes phone numbers to standard E.164 digits without '+' (e.g. 919322759343).
 * Defaults to 91 prefix for 10-digit Indian numbers.
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '919322759343';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits || '919322759343';
}
