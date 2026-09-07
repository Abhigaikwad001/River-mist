export const WHATSAPP_BOOKING_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919876543210';

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
  const cleanNumber = WHATSAPP_BOOKING_NUMBER.replace(/[^0-9]/g, '');
  
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
