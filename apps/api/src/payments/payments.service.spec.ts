import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';

describe('PaymentsService', () => {
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
        findMany: jest.fn().mockResolvedValue([]),
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

  it('should record manual payment and update booking status to CONFIRMED', async () => {
    tx.booking.findUnique.mockResolvedValue({
      id: 1,
      bookingNumber: 'RM-2026-000001',
      status: BookingStatus.REQUESTED,
      totalAmount: 5000,
      advanceRequired: 2000,
      amountPaid: 0,
      balanceAmount: 5000,
      user: { email: 'guest@example.com', name: 'Guest' },
    });

    const res = await service.recordManualPayment(1, 2500, 'UPI', 'UPI-REF-999', 'Received via PhonePe');
    expect(res.success).toBe(true);
    expect(res.status).toBe(BookingStatus.CONFIRMED);
    expect(res.amountPaid).toBe(2500);
    expect(res.balanceAmount).toBe(2500);
    expect(tx.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        bookingId: 1,
        amount: 2500,
        method: 'UPI',
        status: PaymentStatus.CAPTURED,
        razorpayPaymentId: 'UPI-REF-999',
      })
    }));
  });

  it('should reject manual payment with invalid amount', async () => {
    await expect(service.recordManualPayment(1, 0, 'CASH')).rejects.toThrow(BadRequestException);
    await expect(service.recordManualPayment(1, -100, 'CASH')).rejects.toThrow(BadRequestException);
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

    const res = await service.refundPayment(1);

    expect(res.status).toBe(PaymentStatus.REFUNDED);
    expect((service as any).razorpay.payments.refund).toHaveBeenCalledWith('pay_123', {});
  });
});
