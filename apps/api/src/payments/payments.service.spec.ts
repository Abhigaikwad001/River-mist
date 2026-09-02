import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';

describe('PaymentsService (Phase 5)', () => {
  let service: PaymentsService;
  let prisma: any;
  let tx: any;

  beforeEach(async () => {
    tx = {
      payment: {
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 99, ...args.data })),
        update: jest.fn(),
      },
      booking: {
        findUnique: jest.fn(),
        update: jest.fn(),
      }
    };

    prisma = {
      booking: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 99, ...args.data })),
        update: jest.fn().mockImplementation((args) => Promise.resolve({
          id: 99,
          ...args.data,
          amount: 1000,
          booking: {
            id: 1,
            bookingNumber: 'BKG-123',
            user: { email: 'test@example.com', name: 'Test User' }
          }
        })),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return await callback(tx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: NotificationsService,
          useValue: {
            sendPaymentStatus: jest.fn().mockResolvedValue(undefined),
          }
        }
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    
    // Mock Razorpay
    (service as any).razorpay = {
      orders: {
        create: jest.fn().mockResolvedValue({ id: 'order_123' }),
      },
      payments: {
        refund: jest.fn().mockResolvedValue({ id: 'rfnd_123' }),
      }
    };

    process.env.RAZORPAY_KEY_ID = 'test_key_id';
    process.env.RAZORPAY_KEY_SECRET = 'test_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create order successfully for user', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      status: BookingStatus.PAYMENT_PENDING,
      advanceRequired: 1000,
      amountPaid: 0,
      balanceAmount: 1000,
    });

    const res = await service.createOrder(1, 1);
    expect(res.orderId).toBe('order_123');
    expect(res.amount).toBe(100000); // in paise
    expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentStatus.INITIATED, amount: 1000 })
    }));
  });

  it('should reject order creation if user does not own booking', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      status: BookingStatus.PAYMENT_PENDING,
    });

    await expect(service.createOrder(1, 2)).rejects.toThrow(BadRequestException);
  });

  it('should fulfill payment on valid verification signature', async () => {
    const orderId = 'order_123';
    const paymentId = 'pay_123';
    
    const signature = crypto
      .createHmac('sha256', 'test_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    tx.payment.findUnique.mockResolvedValue({
      id: 1,
      bookingId: 1,
      amount: 1000,
      status: PaymentStatus.INITIATED
    });

    tx.booking.findUnique.mockResolvedValue({
      id: 1,
      totalAmount: 1000,
      amountPaid: 0,
      balanceAmount: 1000,
      bookingNumber: 'BKG-123',
      user: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    const res = await service.verifyPayment(orderId, paymentId, signature);
    expect(res.success).toBe(true);
    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentStatus.CAPTURED })
    }));
    expect(tx.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: BookingStatus.CONFIRMED, amountPaid: 1000, balanceAmount: 0 })
    }));
  });

  it('should reject verification on invalid signature', async () => {
    await expect(service.verifyPayment('order_123', 'pay_123', 'bad_signature')).rejects.toThrow(BadRequestException);
  });

  it('should handle idempotency correctly (duplicate callback)', async () => {
    const orderId = 'order_123';
    const paymentId = 'pay_123';
    
    const signature = crypto
      .createHmac('sha256', 'test_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Mock payment already captured
    tx.payment.findUnique.mockResolvedValue({
      id: 1,
      bookingId: 1,
      status: PaymentStatus.CAPTURED
    });

    const res = await service.verifyPayment(orderId, paymentId, signature);
    expect(res.alreadyCaptured).toBe(true);
    expect(tx.payment.update).not.toHaveBeenCalled(); // Shouldn't update payment again
    expect(tx.booking.update).not.toHaveBeenCalled(); // Shouldn't update booking again
  });

  it('should handle failed payment webhook correctly', async () => {
    const payload = {
      event: 'payment.failed',
      payload: { payment: { entity: { order_id: 'order_123' } } }
    };
    
    const signature = crypto
      .createHmac('sha256', 'test_webhook_secret')
      .update(JSON.stringify(payload))
      .digest('hex');

    await service.handleWebhook(payload, signature);

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { razorpayOrderId: 'order_123' },
      data: { status: PaymentStatus.FAILED },
      include: { booking: { include: { user: true } } }
    });
  });

  it('should process full refund correctly', async () => {
    tx.payment.findUnique.mockResolvedValue({
      id: 1,
      amount: 1000,
      razorpayPaymentId: 'pay_123',
      status: PaymentStatus.CAPTURED,
      booking: {
        id: 1,
        totalAmount: 1000,
        amountPaid: 1000,
        balanceAmount: 0,
        bookingNumber: 'BKG-123',
        user: {
          email: 'test@example.com',
          name: 'Test User'
        }
      }
    });

    const res = await service.refundPayment(1); // Full refund

    expect(res.status).toBe(PaymentStatus.REFUNDED);
    expect((service as any).razorpay.payments.refund).toHaveBeenCalledWith('pay_123', {});
    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: PaymentStatus.REFUNDED }
    }));
    expect(tx.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amountPaid: 0, balanceAmount: 1000, status: BookingStatus.REFUNDED })
    }));
  });

  it('should process partial refund correctly', async () => {
    tx.payment.findUnique.mockResolvedValue({
      id: 1,
      amount: 1000,
      razorpayPaymentId: 'pay_123',
      status: PaymentStatus.CAPTURED,
      booking: {
        id: 1,
        totalAmount: 1000,
        amountPaid: 1000,
        balanceAmount: 0,
        bookingNumber: 'BKG-123',
        user: {
          email: 'test@example.com',
          name: 'Test User'
        }
      }
    });

    const res = await service.refundPayment(1, 500); // Partial refund 500

    expect(res.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect((service as any).razorpay.payments.refund).toHaveBeenCalledWith('pay_123', { amount: 50000 });
    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: PaymentStatus.PARTIALLY_REFUNDED }
    }));
    expect(tx.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amountPaid: 500, balanceAmount: 500, status: BookingStatus.REFUND_PENDING })
    }));
  });
});
