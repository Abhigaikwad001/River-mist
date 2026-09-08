import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsAppProvider } from '../whatsapp/whatsapp.provider';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { SendNotificationDto, INotificationProvider } from './providers/notification.provider.interface';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private providers: Record<string, INotificationProvider> = {};

  constructor(
    private prisma: PrismaService,
    private emailProvider: EmailProvider,
    private smsProvider: SmsProvider,
    private whatsAppProvider: WhatsAppProvider,
    private whatsAppService: WhatsAppService,
  ) {
    this.providers['EMAIL'] = this.emailProvider;
    this.providers['SMS'] = this.smsProvider;
    this.providers['WHATSAPP'] = this.whatsAppProvider;
  }

  /**
   * Main entry point to send a notification.
   * Creates a log entry and attempts to send immediately.
   */
  async dispatch(type: 'EMAIL' | 'SMS' | 'WHATSAPP', dto: SendNotificationDto) {
    // 1. Create DB Log
    const log = await this.prisma.notificationLog.create({
      data: {
        type,
        recipient: dto.recipient,
        subject: dto.subject,
        content: dto.content,
        status: 'PENDING',
        bookingId: dto.bookingId,
        quoteId: dto.quoteId,
      }
    });

    // 2. Attempt to send
    await this.processLog(log.id, type, dto);
  }

  private async processLog(logId: number, type: string, dto: SendNotificationDto) {
    const provider = this.providers[type];
    if (!provider) {
      this.logger.error(`No provider configured for type: ${type}`);
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: { status: 'FAILED', errorMessage: `No provider for ${type}` }
      });
      return;
    }

    try {
      await provider.send(dto);
      
      // Update success
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: { status: 'SENT' }
      });
    } catch (error: any) {
      // Update failure
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: { 
          status: 'FAILED',
          errorMessage: error.message || 'Unknown error',
          retryCount: { increment: 1 }
        }
      });
    }
  }

  // --- EVENT TRIGGERS ---

  async sendBookingRequested(bookingId: number, userEmail: string, userName: string, bookingNumber: string) {
    const content = `
      <h1>Booking Request Received</h1>
      <p>Hi ${userName},</p>
      <p>Your booking request (${bookingNumber}) has been received. Our team is reviewing it and will get back to you shortly.</p>
    `;
    await this.dispatch('EMAIL', {
      recipient: userEmail,
      subject: `Booking Request Received: ${bookingNumber}`,
      content,
      bookingId,
    });

    // Fire-and-forget WhatsApp notification
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true, package: true },
      });
      if (booking) {
        await this.whatsAppService.notifyBookingRequested(booking, {
          name: userName,
          email: userEmail,
          phone: booking.user?.phone,
        });
      }
    } catch (waErr: any) {
      this.logger.warn(`WhatsApp request notification failed safely for booking ${bookingNumber}: ${waErr.message}`);
    }
  }

  async sendBookingStatusUpdated(bookingId: number, userEmail: string, userName: string, bookingNumber: string, status: BookingStatus) {
    const content = `
      <h1>Booking Status Update</h1>
      <p>Hi ${userName},</p>
      <p>Your booking (${bookingNumber}) is now: <strong>${status}</strong>.</p>
    `;
    await this.dispatch('EMAIL', {
      recipient: userEmail,
      subject: `Booking Update: ${bookingNumber}`,
      content,
      bookingId,
    });

    // Fire-and-forget WhatsApp notification
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true, package: true },
      });
      if (booking && booking.user?.phone) {
        if (status === BookingStatus.CONFIRMED) {
          await this.whatsAppService.notifyBookingConfirmed(booking, {
            name: userName,
            email: userEmail,
            phone: booking.user.phone,
          });
        } else if (status === BookingStatus.CANCELLED) {
          await this.whatsAppService.notifyBookingCancelled(booking, {
            name: userName,
            email: userEmail,
            phone: booking.user.phone,
          });
        } else if (status === BookingStatus.PAYMENT_PENDING) {
          await this.whatsAppService.notifyPaymentInstructions(booking, {
            name: userName,
            email: userEmail,
            phone: booking.user.phone,
          });
        }
      }
    } catch (waErr: any) {
      this.logger.warn(`WhatsApp status notification failed safely for booking ${bookingNumber}: ${waErr.message}`);
    }
  }

  async sendPaymentStatus(bookingId: number, userEmail: string, userName: string, bookingNumber: string, status: PaymentStatus, amount: number, paymentMethod?: string) {
    const content = `
      <h1>Payment ${status}</h1>
      <p>Hi ${userName},</p>
      <p>Your payment of ₹${amount} for booking ${bookingNumber} was ${status.toLowerCase()}.</p>
    `;
    await this.dispatch('EMAIL', {
      recipient: userEmail,
      subject: `Payment ${status}: ${bookingNumber}`,
      content,
      bookingId,
    });

    // Fire-and-forget WhatsApp notification for captured payments
    if (status === PaymentStatus.CAPTURED) {
      try {
        const booking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
          include: { user: true, package: true },
        });
        if (booking && booking.user?.phone) {
          await this.whatsAppService.notifyPaymentReceived(
            booking,
            { name: userName, email: userEmail, phone: booking.user.phone },
            amount,
            paymentMethod,
          );
        }
      } catch (waErr: any) {
        this.logger.warn(`WhatsApp payment notification failed safely for booking ${bookingNumber}: ${waErr.message}`);
      }
    }
  }

  async sendQuoteCreated(quoteId: number, userEmail: string, userName: string, quoteNumber: string) {
    const content = `
      <h1>Wedding Quote Prepared</h1>
      <p>Hi ${userName},</p>
      <p>We have prepared your quote (${quoteNumber}). Please log in to review the details.</p>
    `;
    await this.dispatch('EMAIL', {
      recipient: userEmail,
      subject: `New Wedding Quote: ${quoteNumber}`,
      content,
      quoteId,
    });

    // Fire-and-forget WhatsApp notification
    try {
      const quote = await this.prisma.weddingQuote.findUnique({
        where: { id: quoteId },
        include: { user: true },
      });
      if (quote) {
        await this.whatsAppService.notifyWeddingQuoteReceived(quote, {
          name: userName,
          email: userEmail,
          phone: quote.user?.phone,
        });
      }
    } catch (waErr: any) {
      this.logger.warn(`WhatsApp quote notification failed safely for quote ${quoteNumber}: ${waErr.message}`);
    }
  }

  async sendQuoteStatusUpdated(quoteId: number, userEmail: string, userName: string, quoteNumber: string, status: string) {
    const content = `
      <h1>Quote Status Update</h1>
      <p>Hi ${userName},</p>
      <p>Your quote (${quoteNumber}) is now: <strong>${status}</strong>.</p>
    `;
    await this.dispatch('EMAIL', {
      recipient: userEmail,
      subject: `Quote Update: ${quoteNumber}`,
      content,
      quoteId,
    });
  }

  // --- CRON JOBS ---

  /**
   * Retry failed notifications every 5 minutes.
   * Only retry up to 3 times.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedNotifications() {
    this.logger.log('Running retry failed notifications job...');
    
    // In a real app we might use a transaction or lock to prevent concurrent processing
    const failedLogs = await this.prisma.notificationLog.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: 3 }
      },
      take: 50 // batch size
    });

    for (const log of failedLogs) {
      this.logger.log(`Retrying notification log ${log.id} (Attempt ${log.retryCount + 1})...`);
      await this.processLog(log.id, log.type, {
        recipient: log.recipient,
        subject: log.subject || undefined,
        content: log.content,
        bookingId: log.bookingId || undefined,
        quoteId: log.quoteId || undefined,
      });
    }
  }

  /**
   * Send booking reminders every day at 10 AM.
   * Finds confirmed bookings for tomorrow.
   */
  @Cron('0 10 * * *')
  async sendBookingReminders() {
    this.logger.log('Running daily booking reminders job...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const upcomingBookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: {
          gte: tomorrow,
          lt: dayAfter
        }
      },
      include: { user: true }
    });

    for (const booking of upcomingBookings) {
      const content = `
        <h1>Upcoming Booking Reminder</h1>
        <p>Hi ${booking.user.name},</p>
        <p>We look forward to hosting you tomorrow at River Mist!</p>
        <p>Booking Reference: ${booking.bookingNumber}</p>
      `;
      
      await this.dispatch('EMAIL', {
        recipient: booking.user.email,
        subject: 'Reminder: Your Upcoming Visit to River Mist',
        content,
        bookingId: booking.id
      });
    }
  }
}
