// @ts-nocheck
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private razorpay: any;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!key_id || !key_secret) {
      this.logger.error('CRITICAL: Razorpay credentials are missing from environment variables (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET). Payments will fail.');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Missing Razorpay credentials in production environment.');
      }
    }

    this.razorpay = new Razorpay({
      key_id: key_id || 'rzp_test_placeholder',
      key_secret: key_secret || 'placeholder_secret',
    });
  }

  async createOrder(bookingId: number, userId?: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (userId && booking.userId !== userId) {
      throw new BadRequestException('Unauthorized to pay for this booking');
    }

    if (booking.status !== BookingStatus.REQUESTED && booking.status !== BookingStatus.APPROVED && booking.status !== BookingStatus.PAYMENT_PENDING) {
      throw new BadRequestException('Booking is not in a state to accept payments');
    }

    try {
      // Determine what to pay: if advance isn't paid, pay advance. Else pay balance.
      let amountToPay = booking.advanceRequired;
      if (booking.amountPaid >= booking.advanceRequired && booking.balanceAmount > 0) {
        amountToPay = booking.balanceAmount;
      }

      const options = {
        amount: amountToPay * 100, // Amount to be paid upfront
        currency: "INR",
        receipt: `receipt_${bookingId}`
      };
      
      const order = await this.razorpay.orders.create(options);
      
      await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: amountToPay,
          method: 'RAZORPAY',
          status: PaymentStatus.INITIATED,
          razorpayOrderId: order.id,
        }
      });

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.PAYMENT_PENDING }
      });

      return {
        orderId: order.id,
        amount: options.amount,
        currency: options.currency,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException('Error creating Razorpay order');
    }
  }

  /**
   * Hardened Idempotent Webhook/Verification Handler
   */
  async verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error('RAZORPAY_KEY_SECRET is not configured.');
    }
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');
    
    if (expectedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid signature');
    }

    return this.fulfillPayment(razorpayOrderId, razorpayPaymentId);
  }

  private async fulfillPayment(razorpayOrderId: string, razorpayPaymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { razorpayOrderId }
      });

      if (!payment) throw new BadRequestException('Payment not found');

      // Idempotency check: If already captured, just return success
      if (payment.status === PaymentStatus.CAPTURED) {
        return { success: true, bookingId: payment.bookingId, alreadyCaptured: true };
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { 
          status: PaymentStatus.CAPTURED,
          razorpayPaymentId
        }
      });

      const booking = await tx.booking.findUnique({ 
        where: { id: payment.bookingId },
        include: { user: true }
      });
      const newAmountPaid = booking.amountPaid + payment.amount;
      const newBalance = booking.totalAmount - newAmountPaid;

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { 
          status: BookingStatus.CONFIRMED, 
          amountPaid: newAmountPaid,
          balanceAmount: newBalance
        }
      });

      // Fire & forget notification
      this.notificationsService.sendPaymentStatus(
        booking.id,
        booking.user.email,
        booking.user.name,
        booking.bookingNumber,
        PaymentStatus.CAPTURED,
        payment.amount
      ).catch((err: unknown) => this.logger.error('Failed to send payment notification', err));

      return { success: true, bookingId: payment.bookingId };
    });
  }

  /**
   * Handle Webhooks from Razorpay
   */
  async handleWebhook(body: any, signature: string) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured.');
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (body.event === 'order.paid' || body.event === 'payment.captured') {
      const paymentEntity = body.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      try {
        // Idempotent payment fulfillment
        await this.fulfillPayment(razorpayOrderId, razorpayPaymentId);
      } catch (err: any) {
        this.logger.error(`Webhook processing failed for order ${razorpayOrderId}: ${err.message}`);
        // But still return 200 OK so Razorpay doesn't retry unnecessarily if it's already captured
      }
    } else if (body.event === 'payment.failed') {
      const paymentEntity = body.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      
      try {
        const failedPayment = await this.prisma.payment.update({
          where: { razorpayOrderId },
          data: { status: PaymentStatus.FAILED },
          include: { booking: { include: { user: true } } }
        });

        this.notificationsService.sendPaymentStatus(
          failedPayment.booking.id,
          failedPayment.booking.user.email,
          failedPayment.booking.user.name,
          failedPayment.booking.bookingNumber,
          PaymentStatus.FAILED,
          failedPayment.amount
        ).catch((err: unknown) => this.logger.error('Failed to send payment notification', err));
      } catch (err: any) {
        this.logger.error(`Failed to mark payment as failed: ${err.message}`);
      }
    }

    return { received: true };
  }

  /**
   * Manual Payment Recording (Admin Only)
   */
  async recordManualPayment(bookingId: number, amount: number, method: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ 
        where: { id: bookingId },
        include: { user: true }
      });
      if (!booking) throw new BadRequestException('Booking not found');

      if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
        throw new BadRequestException('Cannot record payment for this booking status');
      }

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: amount,
          method: method,
          status: PaymentStatus.CAPTURED,
        }
      });

      const newAmountPaid = booking.amountPaid + amount;
      const newBalance = booking.totalAmount - newAmountPaid;

      // Automatically confirm if advance requirement is met
      let newStatus = booking.status;
      if (newAmountPaid >= booking.advanceRequired && booking.status !== BookingStatus.COMPLETED) {
        newStatus = BookingStatus.CONFIRMED;
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { 
          status: newStatus, 
          amountPaid: newAmountPaid,
          balanceAmount: newBalance
        }
      });

      // Fire & forget notification
      this.notificationsService.sendPaymentStatus(
        booking.id,
        booking.user.email,
        booking.user.name,
        booking.bookingNumber,
        PaymentStatus.CAPTURED,
        amount
      ).catch((err: unknown) => this.logger.error('Failed to send manual payment notification', err));

      return { success: true, bookingId, status: newStatus };
    });
  }

  /**
   * Get all payments (Admin)
   */
  async getAllPayments() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            user: true,
          }
        }
      }
    });
  }

  /**
   * Refund a Payment (Admin)
   */
  async refundPayment(paymentId: number, amount?: number) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ 
        where: { id: paymentId },
        include: { booking: true }
      });
      
      if (!payment || !payment.razorpayPaymentId) {
        throw new BadRequestException('Invalid payment for refund');
      }

      if (payment.status !== PaymentStatus.CAPTURED) {
        throw new BadRequestException('Only captured payments can be refunded');
      }
      
      const refundOptions: any = {};
      if (amount) {
        refundOptions.amount = amount * 100; // Razorpay expects paise
      }

      try {
        const refundRes = await this.razorpay.payments.refund(payment.razorpayPaymentId, refundOptions);
        
        const refundAmount = amount || payment.amount;
        const isPartial = refundAmount < payment.amount;
        const newStatus = isPartial ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED;

        await tx.payment.update({
          where: { id: paymentId },
          data: { status: newStatus }
        });

        const newAmountPaid = payment.booking.amountPaid - refundAmount;
        const newBalance = payment.booking.totalAmount - newAmountPaid;

        await tx.booking.update({
          where: { id: payment.booking.id },
          data: {
            amountPaid: Math.max(0, newAmountPaid),
            balanceAmount: newBalance,
            // Depending on business rules, we might mark as REFUND_PENDING or REFUNDED
            status: newAmountPaid <= 0 ? BookingStatus.REFUNDED : BookingStatus.REFUND_PENDING
          }
        });

        return { success: true, refundId: refundRes.id, status: newStatus };
      } catch (err: any) {
        this.logger.error(`Razorpay refund failed: ${err.message}`);
        throw new BadRequestException('Failed to process refund with Razorpay');
      }
    });
  }
}
