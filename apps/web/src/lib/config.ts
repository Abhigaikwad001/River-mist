/**
 * Normalizes any phone string into an international WhatsApp-compatible number without +, spaces, or dashes.
 * Defaults to River Mist business number '919322759343' if empty.
 */
export function normalizeWhatsAppNumber(phone?: string | null): string {
  if (!phone) return '919322759343';
  const digits = phone.replace(/[^0-9]/g, '');
  // If 10 digits (standard Indian phone number), prefix 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // If 11 digits starting with 0, replace with 91
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  return digits || '919322759343';
}

export const WHATSAPP_BOOKING_NUMBER = normalizeWhatsAppNumber(
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919322759343'
);

export interface WhatsAppBookingPayload {
  bookingNumber: string;
  packageName: string;
  dateStr: string;
  headCountAdult: number;
  headCountChild: number;
  guestName: string;
  guestPhone: string;
  totalAmount: number;
}

export function buildWhatsAppMessageUrl(payload: WhatsAppBookingPayload): string {
  const cleanNumber = normalizeWhatsAppNumber(WHATSAPP_BOOKING_NUMBER);
  
  const text = `Hello River Mist,

I would like to request a booking.

Booking ID: ${payload.bookingNumber}
Package: ${payload.packageName}
Date: ${payload.dateStr}
Adults: ${payload.headCountAdult}
Children: ${payload.headCountChild}

Guest Name: ${payload.guestName}
Phone: ${payload.guestPhone}

Estimated Total: ₹${payload.totalAmount.toLocaleString('en-IN')}

Please confirm availability and payment details.`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

export interface WhatsAppQuotePayload {
  quoteNumber: string;
  guestName: string;
  guestPhone: string;
  eventDate: string;
  guestCount: number;
  notes?: string;
}

export function buildWeddingQuoteWhatsAppUrl(payload: WhatsAppQuotePayload): string {
  const cleanNumber = normalizeWhatsAppNumber(WHATSAPP_BOOKING_NUMBER);
  
  const text = `Hello River Mist,

I have submitted a Wedding Quote request.

Quote ID: ${payload.quoteNumber}
Guest Name: ${payload.guestName}
Phone: ${payload.guestPhone}
Tentative Date: ${payload.eventDate}
Expected Guests: ${payload.guestCount}${payload.notes ? `\n\nNotes: ${payload.notes}` : ''}

Looking forward to hearing from your wedding concierge team.`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}
