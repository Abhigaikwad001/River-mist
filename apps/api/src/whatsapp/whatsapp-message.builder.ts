import { Injectable } from '@nestjs/common';
import { WhatsAppTemplateType, WhatsAppMessagePayload } from './whatsapp.types';

export interface BookingMessageContext {
  bookingNumber: string;
  customerName: string;
  customerPhone?: string;
  packageName: string;
  dateStr: string;
  headCountAdult: number;
  headCountChild: number;
  totalAmount: number;
  advanceRequired?: number;
  balanceAmount?: number;
  paymentMethod?: string;
  amountPaid?: number;
  amountRequested?: number;
  upiId?: string;
  payeeName?: string;
  upiUri?: string;
}

export interface QuoteMessageContext {
  quoteNumber: string;
  customerName: string;
  customerPhone?: string;
  eventDate: string;
  guestCount: number;
  notes?: string;
}

@Injectable()
export class WhatsAppMessageBuilder {
  /**
   * Builds the message payload for Meta Cloud API, using approved template if provided or falling back to text.
   */
  buildMessage(
    recipientPhone: string,
    type: WhatsAppTemplateType,
    context: BookingMessageContext | QuoteMessageContext,
    templateName?: string,
  ): WhatsAppMessagePayload {
    const textBody = this.buildTextBody(type, context);

    if (templateName) {
      return {
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: this.buildTemplateComponents(type, context),
        },
      };
    }

    return {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: textBody,
      },
    };
  }

  /**
   * Formats human-readable WhatsApp text message.
   */
  buildTextBody(type: WhatsAppTemplateType, ctx: any): string {
    switch (type) {
      case WhatsAppTemplateType.BOOKING_REQUEST:
        return (
          `🌿 *River Mist — Booking Request Received*\n\n` +
          `Hello ${ctx.customerName},\n` +
          `Thank you for choosing River Mist Resort! Your booking request has been received and is currently under review.\n\n` +
          `📋 *Booking ID:* ${ctx.bookingNumber}\n` +
          `🏡 *Package:* ${ctx.packageName}\n` +
          `📅 *Date:* ${ctx.dateStr}\n` +
          `👥 *Guests:* ${ctx.headCountAdult} Adults${ctx.headCountChild > 0 ? `, ${ctx.headCountChild} Children` : ''}\n` +
          `💰 *Estimated Total:* ₹${ctx.totalAmount?.toLocaleString('en-IN') || 0}\n\n` +
          `Our concierge team is verifying availability. We will message you shortly with confirmation and payment details.`
        );

      case WhatsAppTemplateType.BOOKING_CONFIRMED:
        return (
          `🎉 *River Mist — Booking Confirmed!*\n\n` +
          `Dear ${ctx.customerName},\n` +
          `Your booking has been confirmed!\n\n` +
          `📋 *Booking ID:* ${ctx.bookingNumber}\n` +
          `🏡 *Package:* ${ctx.packageName}\n` +
          `📅 *Date:* ${ctx.dateStr}\n` +
          `👥 *Guests:* ${ctx.headCountAdult} Adults${ctx.headCountChild > 0 ? `, ${ctx.headCountChild} Children` : ''}\n` +
          `💵 *Amount Paid:* ₹${ctx.amountPaid?.toLocaleString('en-IN') || 0}\n` +
          `💳 *Balance Due:* ₹${ctx.balanceAmount?.toLocaleString('en-IN') || 0}\n\n` +
          `We look forward to welcoming you to River Mist. For any queries, reply directly to this message!`
        );

      case WhatsAppTemplateType.PAYMENT_INSTRUCTIONS: {
        const amtRequested = ctx.amountRequested || ctx.advanceRequired || ctx.balanceAmount || ctx.totalAmount || 0;
        const paidSoFar = ctx.amountPaid || 0;
        const advanceReq = ctx.advanceRequired || amtRequested;
        const upiId = ctx.upiId || 'rivermist@upi';
        const payee = ctx.payeeName || 'River Mist';
        const upiUri = ctx.upiUri || `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amtRequested.toFixed(2)}&cu=INR&tn=${encodeURIComponent('River Mist ' + ctx.bookingNumber)}`;

        return (
          `💳 *River Mist — Payment Instructions*\n\n` +
          `Dear ${ctx.customerName},\n` +
          `To secure your reservation for Booking ID *${ctx.bookingNumber}*:\n\n` +
          `💰 *Total Booking Amount:* ₹${ctx.totalAmount?.toLocaleString('en-IN') || 0}\n` +
          `💵 *Amount Paid So Far:* ₹${paidSoFar.toLocaleString('en-IN')}\n` +
          `*Advance Required:* ₹${advanceReq.toLocaleString('en-IN')}\n` +
          `⚡ *Amount Requested Now:* ₹${amtRequested.toLocaleString('en-IN')}\n` +
          `💳 *Balance Due:* ₹${(ctx.balanceAmount ?? Math.max(0, (ctx.totalAmount || 0) - paidSoFar)).toLocaleString('en-IN')}\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `📲 *UPI PAYMENT DETAILS*\n` +
          `🏦 *UPI ID:* ${upiId}\n` +
          `🏛️ *Account Name:* ${payee}\n` +
          `🔗 *Tap-to-Pay UPI Link (if supported by your app):*\n${upiUri}\n\n` +
          `📱 *Paying on this phone?* If the link above does not open directly in WhatsApp, simply copy the UPI ID (*${upiId}*) and paste it into Google Pay, PhonePe, Paytm, or your UPI app with amount *₹${amtRequested.toLocaleString('en-IN')}* and reference *${ctx.bookingNumber}*.\n\n` +
          `Please use the UPI ID / Bank details above to complete payment. After completing the transfer, please reply to this chat with your transaction screenshot or reference number.\n\n` +
          `⚠️ *IMPORTANT:* Your reservation is confirmed only after staff verification of payment.`
        );
      }

      case WhatsAppTemplateType.PAYMENT_RECEIVED:
        return (
          `✅ *River Mist — Payment Received*\n\n` +
          `Dear ${ctx.customerName},\n` +
          `We have successfully received your payment of *₹${ctx.amountPaid?.toLocaleString('en-IN') || 0}* ` +
          `for Booking ID *${ctx.bookingNumber}* via ${ctx.paymentMethod || 'manual verification'}.\n\n` +
          `💵 *Amount:* ₹${ctx.amountPaid?.toLocaleString('en-IN') || 0}\n` +
          `💳 *Remaining Balance:* ₹${ctx.balanceAmount?.toLocaleString('en-IN') || 0}\n\n` +
          `Thank you for booking with River Mist!`
        );

      case WhatsAppTemplateType.BOOKING_CANCELLED:
        return (
          `⚠️ *River Mist — Booking Cancelled*\n\n` +
          `Dear ${ctx.customerName},\n` +
          `Your booking *${ctx.bookingNumber}* for ${ctx.dateStr} has been cancelled.\n\n` +
          `If you believe this is an error or would like to reschedule, please contact our support team immediately.`
        );

      case WhatsAppTemplateType.WEDDING_QUOTE_REQUEST:
        return (
          `💍 *River Mist — Wedding Quote Request Received*\n\n` +
          `Hello ${ctx.customerName},\n` +
          `Thank you for considering River Mist for your grand celebration!\n\n` +
          `📋 *Quote Reference:* ${ctx.quoteNumber}\n` +
          `📅 *Tentative Date:* ${ctx.eventDate}\n` +
          `👥 *Expected Guests:* ${ctx.guestCount} guests\n\n` +
          `Our dedicated wedding planner will contact you within 24 hours with a customized quotation and venue itinerary.`
        );

      default:
        return `Hello ${ctx.customerName || 'Guest'}, this is an update regarding your booking with River Mist.`;
    }
  }

  /**
   * Formats components & body parameters for approved Meta WhatsApp templates.
   */
  private buildTemplateComponents(type: WhatsAppTemplateType, ctx: any): any[] {
    const parameters: Array<{ type: 'text'; text: string }> = [];

    switch (type) {
      case WhatsAppTemplateType.BOOKING_REQUEST:
        parameters.push(
          { type: 'text', text: String(ctx.customerName) },
          { type: 'text', text: String(ctx.bookingNumber) },
          { type: 'text', text: String(ctx.packageName) },
          { type: 'text', text: String(ctx.dateStr) },
          { type: 'text', text: `₹${ctx.totalAmount?.toLocaleString('en-IN') || 0}` },
        );
        break;

      case WhatsAppTemplateType.BOOKING_CONFIRMED:
        parameters.push(
          { type: 'text', text: String(ctx.customerName) },
          { type: 'text', text: String(ctx.bookingNumber) },
          { type: 'text', text: String(ctx.packageName) },
          { type: 'text', text: String(ctx.dateStr) },
        );
        break;

      case WhatsAppTemplateType.PAYMENT_INSTRUCTIONS:
        parameters.push(
          { type: 'text', text: String(ctx.customerName) },
          { type: 'text', text: String(ctx.bookingNumber) },
          { type: 'text', text: `₹${ctx.advanceRequired?.toLocaleString('en-IN') || 0}` },
        );
        break;

      case WhatsAppTemplateType.PAYMENT_RECEIVED:
        parameters.push(
          { type: 'text', text: String(ctx.customerName) },
          { type: 'text', text: `₹${ctx.amountPaid?.toLocaleString('en-IN') || 0}` },
          { type: 'text', text: String(ctx.bookingNumber) },
        );
        break;

      case WhatsAppTemplateType.BOOKING_CANCELLED:
        parameters.push(
          { type: 'text', text: String(ctx.customerName) },
          { type: 'text', text: String(ctx.bookingNumber) },
        );
        break;

      case WhatsAppTemplateType.WEDDING_QUOTE_REQUEST:
        parameters.push(
          { type: 'text', text: String(ctx.customerName) },
          { type: 'text', text: String(ctx.quoteNumber) },
          { type: 'text', text: String(ctx.eventDate) },
          { type: 'text', text: String(ctx.guestCount) },
        );
        break;
    }

    return [{ type: 'body', parameters }];
  }
}
