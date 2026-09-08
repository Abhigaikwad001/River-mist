import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppClient } from './whatsapp.client';
import { WhatsAppMessageBuilder, BookingMessageContext, QuoteMessageContext } from './whatsapp-message.builder';
import {
  WhatsAppConfig,
  WhatsAppMode,
  WhatsAppTemplateType,
  WhatsAppStatusDto,
  normalizePhoneNumber,
} from './whatsapp.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private config: WhatsAppConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: WhatsAppClient,
    private readonly messageBuilder: WhatsAppMessageBuilder,
  ) {
    this.reloadConfig();
  }

  /**
   * Loads and normalizes WhatsApp configuration from environment variables.
   */
  reloadConfig(): void {
    const rawMode = (process.env.WHATSAPP_MODE || 'HYBRID').toUpperCase();
    const mode: WhatsAppMode = ['HYBRID', 'CLOUD_API', 'CLICK_TO_CHAT'].includes(rawMode)
      ? (rawMode as WhatsAppMode)
      : 'HYBRID';

    this.config = {
      mode,
      businessPhoneNumber: normalizePhoneNumber(process.env.WHATSAPP_BUSINESS_PHONE_NUMBER || '919322759343'),
      cloudApiToken: process.env.WHATSAPP_CLOUD_API_TOKEN?.trim(),
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim(),
      apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0',
      templates: {
        [WhatsAppTemplateType.BOOKING_REQUEST]: process.env.WHATSAPP_TEMPLATE_BOOKING_REQUEST?.trim(),
        [WhatsAppTemplateType.BOOKING_CONFIRMED]: process.env.WHATSAPP_TEMPLATE_BOOKING_CONFIRMED?.trim(),
        [WhatsAppTemplateType.PAYMENT_INSTRUCTIONS]: process.env.WHATSAPP_TEMPLATE_PAYMENT_INSTRUCTIONS?.trim(),
        [WhatsAppTemplateType.PAYMENT_RECEIVED]: process.env.WHATSAPP_TEMPLATE_PAYMENT_RECEIVED?.trim(),
        [WhatsAppTemplateType.BOOKING_CANCELLED]: process.env.WHATSAPP_TEMPLATE_BOOKING_CANCELLED?.trim(),
        [WhatsAppTemplateType.WEDDING_QUOTE_REQUEST]: process.env.WHATSAPP_TEMPLATE_WEDDING_QUOTE?.trim(),
      },
    };

    if (this.config.cloudApiToken) {
      this.client.registerSecret(this.config.cloudApiToken);
    }

    if (this.isCloudApiConfigured()) {
      this.logger.log(`WhatsApp Service initialized in ${this.config.mode} mode with Meta Cloud API configured.`);
    } else {
      this.logger.log(
        `WhatsApp Service running in ${this.config.mode} mode. Cloud API credentials absent; wa.me Click-to-Chat active.`,
      );
    }
  }

  isCloudApiConfigured(): boolean {
    return Boolean(this.config.cloudApiToken && this.config.phoneNumberId);
  }

  getConfig(): WhatsAppConfig {
    return this.config;
  }

  /**
   * Diagnostic admin status check without exposing secrets.
   */
  getStatus(): WhatsAppStatusDto {
    const activeTemplates: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.config.templates)) {
      if (v) activeTemplates[k] = v;
    }

    return {
      mode: this.config.mode,
      configured: this.isCloudApiConfigured(),
      businessPhoneNumber: this.config.businessPhoneNumber,
      apiVersion: this.config.apiVersion,
      phoneNumberIdConfigured: Boolean(this.config.phoneNumberId),
      tokenConfigured: Boolean(this.config.cloudApiToken),
      activeTemplates,
    };
  }

  /**
   * Core dispatcher: formats payload, creates NotificationLog, handles Cloud API dispatch or wa.me fallback.
   * Guaranteed never to throw uncaught exceptions into calling transactions.
   */
  async dispatchNotification(options: {
    recipientPhone?: string | null;
    type: WhatsAppTemplateType;
    context: BookingMessageContext | QuoteMessageContext;
    bookingId?: number;
    quoteId?: number;
  }): Promise<{ success: boolean; logId?: number; messageId?: string; fallbackUrl?: string }> {
    const rawRecipient = options.recipientPhone || this.config.businessPhoneNumber;
    const recipient = normalizePhoneNumber(rawRecipient);
    const templateName = this.config.templates[options.type];
    const textPreview = this.messageBuilder.buildTextBody(options.type, options.context);

    // 1. Create NotificationLog entry
    let logId: number | undefined;
    try {
      const log = await this.prisma.notificationLog.create({
        data: {
          type: 'WHATSAPP',
          recipient,
          subject: templateName ? `TEMPLATE: ${templateName}` : `WHATSAPP: ${options.type}`,
          content: textPreview,
          status: 'PENDING',
          bookingId: options.bookingId,
          quoteId: options.quoteId,
        },
      });
      logId = log.id;
    } catch (dbErr: any) {
      this.logger.error(`Failed to record NotificationLog for WhatsApp dispatch: ${dbErr.message}`);
    }

    // 2. Check if Cloud API is enabled and configured
    const canUseCloudApi =
      (this.config.mode === 'CLOUD_API' || this.config.mode === 'HYBRID') && this.isCloudApiConfigured();

    if (!canUseCloudApi) {
      // In CLICK_TO_CHAT or unconfigured mode, mark as SENT (wa.me fallback ready)
      if (logId) {
        await this.prisma.notificationLog
          .update({
            where: { id: logId },
            data: {
              status: 'SENT',
              subject: `CLICK_TO_CHAT_READY: ${options.type}`,
            },
          })
          .catch(() => {});
      }
      return {
        success: true,
        logId,
        fallbackUrl: `https://wa.me/${recipient}?text=${encodeURIComponent(textPreview)}`,
      };
    }

    // 3. Dispatch via Meta WhatsApp Cloud API
    try {
      const payload = this.messageBuilder.buildMessage(recipient, options.type, options.context, templateName);
      const result = await this.client.sendMessage(
        this.config.apiVersion,
        this.config.phoneNumberId!,
        this.config.cloudApiToken!,
        payload,
      );

      const messageId = result.messages?.[0]?.id;

      if (logId) {
        await this.prisma.notificationLog.update({
          where: { id: logId },
          data: {
            status: 'SENT',
            subject: messageId ? `WAMID: ${messageId}` : `WHATSAPP: ${options.type}`,
          },
        });
      }

      return { success: true, logId, messageId };
    } catch (err: any) {
      const sanitizedError = this.client.sanitizeSecret(err.message || 'WhatsApp Cloud API Error');
      this.logger.warn(`WhatsApp dispatch failed for recipient ${recipient}: ${sanitizedError}`);

      if (logId) {
        await this.prisma.notificationLog
          .update({
            where: { id: logId },
            data: {
              status: 'FAILED',
              errorMessage: sanitizedError,
              retryCount: { increment: 1 },
            },
          })
          .catch(() => {});
      }

      return {
        success: false,
        logId,
        fallbackUrl: `https://wa.me/${recipient}?text=${encodeURIComponent(textPreview)}`,
      };
    }
  }

  // --- HIGHER LEVEL CONVENIENCE METHODS ---

  async notifyBookingRequested(booking: any, user: { name: string; email?: string; phone?: string | null }) {
    const dateStr = booking.date instanceof Date ? booking.date.toISOString().split('T')[0] : String(booking.date);
    const context: BookingMessageContext = {
      bookingNumber: booking.bookingNumber,
      customerName: user.name || 'Valued Guest',
      customerPhone: user.phone || undefined,
      packageName: booking.package?.name || 'River Mist Experience',
      dateStr,
      headCountAdult: booking.headCountAdult || 1,
      headCountChild: booking.headCountChild || 0,
      totalAmount: booking.totalAmount || 0,
      advanceRequired: booking.advanceRequired || 0,
    };

    // 1. Notify Customer
    if (user.phone) {
      await this.dispatchNotification({
        recipientPhone: user.phone,
        type: WhatsAppTemplateType.BOOKING_REQUEST,
        context,
        bookingId: booking.id,
      });
    }

    // 2. Notify River Mist Business WhatsApp Desk
    if (this.config.businessPhoneNumber && this.config.businessPhoneNumber !== normalizePhoneNumber(user.phone)) {
      await this.dispatchNotification({
        recipientPhone: this.config.businessPhoneNumber,
        type: WhatsAppTemplateType.BOOKING_REQUEST,
        context: {
          ...context,
          customerName: `[ADMIN ALERT] New Request from ${user.name} (${user.phone || 'No phone'})`,
        },
        bookingId: booking.id,
      });
    }
  }

  async notifyBookingConfirmed(booking: any, user: { name: string; email?: string; phone?: string | null }) {
    if (!user.phone) return;
    const dateStr = booking.date instanceof Date ? booking.date.toISOString().split('T')[0] : String(booking.date);
    const context: BookingMessageContext = {
      bookingNumber: booking.bookingNumber,
      customerName: user.name || 'Valued Guest',
      customerPhone: user.phone,
      packageName: booking.package?.name || 'River Mist Experience',
      dateStr,
      headCountAdult: booking.headCountAdult || 1,
      headCountChild: booking.headCountChild || 0,
      totalAmount: booking.totalAmount || 0,
      amountPaid: booking.amountPaid || 0,
      balanceAmount: booking.balanceAmount || 0,
    };

    await this.dispatchNotification({
      recipientPhone: user.phone,
      type: WhatsAppTemplateType.BOOKING_CONFIRMED,
      context,
      bookingId: booking.id,
    });
  }

  async notifyPaymentInstructions(booking: any, user: { name: string; email?: string; phone?: string | null }) {
    if (!user.phone) return;
    const dateStr = booking.date instanceof Date ? booking.date.toISOString().split('T')[0] : String(booking.date);
    const context: BookingMessageContext = {
      bookingNumber: booking.bookingNumber,
      customerName: user.name || 'Valued Guest',
      packageName: booking.package?.name || 'River Mist Experience',
      dateStr,
      headCountAdult: booking.headCountAdult || 1,
      headCountChild: booking.headCountChild || 0,
      totalAmount: booking.totalAmount || 0,
      advanceRequired: booking.advanceRequired || 0,
      balanceAmount: booking.balanceAmount || 0,
    };

    await this.dispatchNotification({
      recipientPhone: user.phone,
      type: WhatsAppTemplateType.PAYMENT_INSTRUCTIONS,
      context,
      bookingId: booking.id,
    });
  }

  /**
   * Dispatches an exact-amount payment request with dynamically generated in-memory QR code.
   * Includes idempotency protection to prevent duplicate customer notifications.
   */
  async sendPaymentRequestWithQr(params: {
    booking: any;
    user?: { name?: string; email?: string; phone?: string | null };
    customer?: { name?: string; email?: string; phone?: string | null };
    amountRequested: number;
    upiId?: string;
    payeeName?: string;
    upiUri: string;
    qrBuffer: Buffer;
    qrDataUrl?: string;
    actorUserId?: number;
    force?: boolean;
  }): Promise<{
    success: boolean;
    status?: string;
    duplicateSuppressed?: boolean;
    mediaId?: string;
    mediaError?: string;
    errorMessage?: string;
    messageId?: string;
    fallbackUrl?: string;
    qrDataUrl?: string;
    upiUri: string;
    amountRequested: number;
  }> {
    const userObj = params.user || params.customer || {};
    const rawRecipient = userObj.phone || this.config.businessPhoneNumber;
    const recipient = normalizePhoneNumber(rawRecipient);
    const dateStr =
      params.booking.date instanceof Date
        ? params.booking.date.toISOString().split('T')[0]
        : String(params.booking.date);

    const context: BookingMessageContext = {
      bookingNumber: params.booking.bookingNumber,
      customerName: userObj.name || 'Valued Guest',
      customerPhone: userObj.phone || undefined,
      packageName: params.booking.package?.name || 'River Mist Experience',
      dateStr,
      headCountAdult: params.booking.headCountAdult || 1,
      headCountChild: params.booking.headCountChild || 0,
      totalAmount: params.booking.totalAmount || 0,
      amountPaid: params.booking.amountPaid || 0,
      advanceRequired: params.booking.advanceRequired || 0,
      balanceAmount: params.booking.balanceAmount || 0,
      amountRequested: params.amountRequested,
      upiId: params.upiId,
      payeeName: params.payeeName,
      upiUri: params.upiUri,
    };

    const textCaption = this.messageBuilder.buildTextBody(WhatsAppTemplateType.PAYMENT_INSTRUCTIONS, context);
    const imageCaption = this.messageBuilder.buildPaymentQrCaption(context);
    const fallbackUrl = `https://wa.me/${recipient}?text=${encodeURIComponent(textCaption)}`;

    // 1. Idempotency Guard: Suppress identical payment requests within 5 minutes
    if (!params.force) {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentLog = await this.prisma.notificationLog.findFirst({
          where: {
            bookingId: params.booking.id,
            type: 'WHATSAPP',
            recipient,
            status: 'SENT',
            createdAt: { gte: fiveMinutesAgo },
            content: { contains: `₹${params.amountRequested.toLocaleString('en-IN')}` },
          },
        });

        if (recentLog) {
          this.logger.log(
            `Suppressed duplicate payment request for booking #${params.booking.bookingNumber} (₹${params.amountRequested}) to ${recipient}`,
          );
          const extractedMessageId =
            (recentLog as any).providerMessageId ||
            (recentLog.subject?.startsWith('WAMID')
              ? recentLog.subject.replace(/^WAMID(_MEDIA|_TEXT_FALLBACK)?:\s*/, '')
              : undefined);

          return {
            success: true,
            status: 'ALREADY_SENT',
            duplicateSuppressed: true,
            messageId: extractedMessageId,
            fallbackUrl,
            qrDataUrl: params.qrDataUrl,
            upiUri: params.upiUri,
            amountRequested: params.amountRequested,
          };
        }
      } catch (checkErr: any) {
        this.logger.warn(`Idempotency check skipped due to error: ${checkErr.message}`);
      }
    }

    // 2. Create NotificationLog entry
    let logId: number | undefined;
    try {
      const log = await this.prisma.notificationLog.create({
        data: {
          type: 'WHATSAPP',
          recipient,
          subject: `PAYMENT_REQUEST: ₹${params.amountRequested}`,
          content: textCaption,
          status: 'PENDING',
          bookingId: params.booking.id,
        },
      });
      logId = log.id;
    } catch (dbErr: any) {
      this.logger.error(`Failed to record NotificationLog for payment QR: ${dbErr.message}`);
    }

    const canUseCloudApi =
      (this.config.mode === 'CLOUD_API' || this.config.mode === 'HYBRID') && this.isCloudApiConfigured();

    if (!canUseCloudApi) {
      if (logId) {
        await this.prisma.notificationLog
          .update({
            where: { id: logId },
            data: {
              status: 'SENT',
              subject: `CLICK_TO_CHAT_READY: PAYMENT_REQUEST`,
            },
          })
          .catch(() => {});
      }
      return {
        success: true,
        status: 'FALLBACK_GENERATED',
        fallbackUrl,
        qrDataUrl: params.qrDataUrl,
        upiUri: params.upiUri,
        amountRequested: params.amountRequested,
      };
    }

    // 3. Dispatch via Meta WhatsApp Cloud API with In-Memory Media Upload
    try {
      // Step A: Upload QR buffer directly in-memory to Meta Media Endpoint
      const uploadRes = await this.client.uploadMedia(
        this.config.apiVersion,
        this.config.phoneNumberId!,
        this.config.cloudApiToken!,
        params.qrBuffer,
        'image/png',
        `rivermist-${params.booking.bookingNumber}-qr.png`,
      );

      // Step B: Send official Image message with payment caption (strictly <= 1024 characters)
      const msgRes = await this.client.sendImageMessage(
        this.config.apiVersion,
        this.config.phoneNumberId!,
        this.config.cloudApiToken!,
        recipient,
        uploadRes.id,
        imageCaption,
      );

      const messageId = msgRes.messages?.[0]?.id;
      if (logId) {
        await this.prisma.notificationLog
          .update({
            where: { id: logId },
            data: {
              status: 'SENT',
              subject: messageId ? `WAMID_MEDIA: ${messageId}` : `WHATSAPP: PAYMENT_REQUEST`,
            },
          })
          .catch(() => {});
      }

      return {
        success: true,
        status: 'SENT',
        mediaId: uploadRes.id,
        messageId,
        fallbackUrl,
        qrDataUrl: params.qrDataUrl,
        upiUri: params.upiUri,
        amountRequested: params.amountRequested,
      };
    } catch (err: any) {
      const sanitizedError = this.client.sanitizeSecret(err.message || 'WhatsApp Cloud API Media Error');
      this.logger.error(
        `Failed to send WhatsApp payment QR to ${recipient}: ${sanitizedError}. Initiating text instructions fallback.`,
      );

      // Graceful fallback: Attempt sending full payment instructions as a WhatsApp text message
      try {
        const textMsgRes = await this.client.sendMessage(
          this.config.apiVersion,
          this.config.phoneNumberId!,
          this.config.cloudApiToken!,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipient,
            type: 'text',
            text: { body: textCaption },
          },
        );

        const textMessageId = textMsgRes.messages?.[0]?.id;
        if (logId) {
          await this.prisma.notificationLog
            .update({
              where: { id: logId },
              data: {
                status: 'SENT',
                subject: textMessageId ? `WAMID_TEXT_FALLBACK: ${textMessageId}` : `WHATSAPP: PAYMENT_REQUEST_TEXT`,
                errorMessage: `Media QR upload/dispatch failed: ${sanitizedError}. Text fallback dispatched successfully.`,
              },
            })
            .catch(() => {});
        }

        return {
          success: true,
          status: 'TEXT_FALLBACK_SENT',
          mediaError: sanitizedError,
          messageId: textMessageId,
          fallbackUrl,
          qrDataUrl: params.qrDataUrl,
          upiUri: params.upiUri,
          amountRequested: params.amountRequested,
        };
      } catch (textErr: any) {
        const sanitizedTextError = this.client.sanitizeSecret(textErr.message || 'WhatsApp Cloud API Text Error');
        this.logger.error(`Both Media and Text fallback failed for ${recipient}: ${sanitizedTextError}`);
        if (logId) {
          await this.prisma.notificationLog
            .update({
              where: { id: logId },
              data: {
                status: 'FAILED',
                errorMessage: `Media QR failed: ${sanitizedError} | Text fallback failed: ${sanitizedTextError}`,
                retryCount: { increment: 1 },
              },
            })
            .catch(() => {});
        }

        return {
          success: false,
          status: 'FAILED',
          mediaError: sanitizedError,
          errorMessage: sanitizedTextError,
          fallbackUrl,
          qrDataUrl: params.qrDataUrl,
          upiUri: params.upiUri,
          amountRequested: params.amountRequested,
        };
      }
    }
  }

  async notifyPaymentReceived(
    booking: any,
    user: { name: string; email?: string; phone?: string | null },
    amount: number,
    paymentMethod?: string,
  ) {
    if (!user.phone) return;
    const context: BookingMessageContext = {
      bookingNumber: booking.bookingNumber,
      customerName: user.name || 'Valued Guest',
      packageName: booking.package?.name || 'River Mist Experience',
      dateStr: String(booking.date),
      headCountAdult: booking.headCountAdult || 1,
      headCountChild: booking.headCountChild || 0,
      totalAmount: booking.totalAmount || 0,
      amountPaid: amount,
      balanceAmount: booking.balanceAmount || 0,
      paymentMethod,
    };

    await this.dispatchNotification({
      recipientPhone: user.phone,
      type: WhatsAppTemplateType.PAYMENT_RECEIVED,
      context,
      bookingId: booking.id,
    });
  }

  async notifyBookingCancelled(booking: any, user: { name: string; email?: string; phone?: string | null }) {
    if (!user.phone) return;
    const dateStr = booking.date instanceof Date ? booking.date.toISOString().split('T')[0] : String(booking.date);
    const context: BookingMessageContext = {
      bookingNumber: booking.bookingNumber,
      customerName: user.name || 'Valued Guest',
      packageName: booking.package?.name || 'River Mist Experience',
      dateStr,
      headCountAdult: booking.headCountAdult || 1,
      headCountChild: booking.headCountChild || 0,
      totalAmount: booking.totalAmount || 0,
    };

    await this.dispatchNotification({
      recipientPhone: user.phone,
      type: WhatsAppTemplateType.BOOKING_CANCELLED,
      context,
      bookingId: booking.id,
    });
  }

  async notifyWeddingQuoteReceived(
    quote: any,
    user: { name: string; email?: string; phone?: string | null },
  ) {
    const dateStr = quote.eventDate instanceof Date ? quote.eventDate.toISOString().split('T')[0] : String(quote.eventDate);
    const context: QuoteMessageContext = {
      quoteNumber: quote.quoteNumber,
      customerName: user.name || 'Wedding Planner / Guest',
      customerPhone: user.phone || undefined,
      eventDate: dateStr,
      guestCount: quote.guestCount || 100,
      notes: quote.notes || undefined,
    };

    // 1. Notify Customer
    if (user.phone) {
      await this.dispatchNotification({
        recipientPhone: user.phone,
        type: WhatsAppTemplateType.WEDDING_QUOTE_REQUEST,
        context,
        quoteId: quote.id,
      });
    }

    // 2. Notify River Mist Wedding Desk
    if (this.config.businessPhoneNumber && this.config.businessPhoneNumber !== normalizePhoneNumber(user.phone)) {
      await this.dispatchNotification({
        recipientPhone: this.config.businessPhoneNumber,
        type: WhatsAppTemplateType.WEDDING_QUOTE_REQUEST,
        context: {
          ...context,
          customerName: `[ADMIN ALERT] Wedding Lead: ${user.name} (${user.phone || 'No phone'})`,
        },
        quoteId: quote.id,
      });
    }
  }
}
