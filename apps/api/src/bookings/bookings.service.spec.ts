import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CapacityService } from '../capacity/capacity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { UpiPaymentQrService } from '../payments/qr/upi-payment-qr.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventType, BookingStatus } from '@prisma/client';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: any;
  let tx: any;
  let mockUpiPaymentQrService: any;
  let mockWhatsAppService: any;

  const mockAuditService = {
    logAction: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const mockQrResult = {
      amount: 3000,
      upiUri: 'upi://pay?pa=rivermist@upi&pn=River%20Mist&am=3000.00&cu=INR&tn=RM-1',
      qrBuffer: Buffer.from('fake-qr-data'),
      qrDataUrl: 'data:image/png;base64,fake-qr-data',
      calculation: {
        amountRequested: 3000,
        totalAmount: 12000,
        advanceRequired: 3000,
        amountPaid: 0,
        balanceAmount: 12000,
      },
      financials: {
        amountRequested: 3000,
        totalAmount: 12000,
        advanceRequired: 3000,
        amountPaid: 0,
        balanceAmount: 12000,
      },
      bookingId: 101,
      bookingNumber: 'RM-2026-000101',
    };

    mockUpiPaymentQrService = {
      generatePaymentRequest: jest.fn().mockResolvedValue(mockQrResult),
      generatePaymentQr: jest.fn().mockResolvedValue(mockQrResult),
      calculateAuthoritativeAmount: jest.fn().mockReturnValue(mockQrResult.calculation),
    };

    mockWhatsAppService = {
      sendPaymentRequestWithQr: jest.fn().mockResolvedValue({
        success: true,
        status: 'SENT',
        messageId: 'wam_test_123',
      }),
    };

    tx = {
      booking: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 1, ...args.data })),
      },
      discount: {
        update: jest.fn().mockResolvedValue({}),
      },
      $queryRaw: jest.fn(),
    };

    prisma = {
      booking: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      package: {
        findUnique: jest.fn(),
      },
      activity: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      resource: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 10, email: 'guest@example.com', name: 'Guest' }),
      },
      auditLog: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return await callback(tx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: CapacityService,
          useValue: {
            validateAndLockCapacity: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: NotificationsService,
          useValue: {
            sendBookingRequested: jest.fn().mockResolvedValue(undefined),
            sendBookingStatusUpdated: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: UpiPaymentQrService,
          useValue: mockUpiPaymentQrService,
        },
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBooking Pricing Precision & Advance Calculation', () => {
    it('should calculate Day Tourism booking with 100% advance on discounted total', async () => {
      prisma.package.findUnique.mockResolvedValue({
        id: 1,
        name: 'Day Pass',
        slug: 'day-pass',
        minGuests: 1,
        priceAdult: 2000,
        priceChild: 1000,
      });

      tx.$queryRaw.mockResolvedValue([
        {
          id: 100,
          code: 'MONSOON20',
          type: 'PERCENTAGE',
          value: 20,
          active: true,
          validFrom: null,
          validUntil: null,
          usageLimit: 100,
          usageCount: 0,
          minBookingAmount: 0,
          maxDiscountAmount: 1000,
        },
      ]);

      const res = await service.createBooking(
        {
          date: '2026-09-15',
          type: EventType.DAY_TOURISM,
          packageId: 1,
          headCountAdult: 2, // 2 * 2000 = 4000 subtotal
          headCountChild: 0,
          discountCode: 'MONSOON20', // 20% of 4000 = 800 discount
        },
        10,
      );

      expect(res.subtotalAmount).toBe(4000);
      expect(res.discountAmount).toBe(800);
      expect(res.totalAmount).toBe(3200); // 4000 - 800 = 3200
      expect(res.advanceRequired).toBe(3200); // Day tourism = 100% of discounted total
      expect(res.balanceAmount).toBe(3200);
    });

    it('should calculate Wedding booking with 25% advance on discounted total', async () => {
      prisma.package.findUnique.mockResolvedValue({
        id: 2,
        name: 'Royal Wedding',
        slug: 'royal-wedding',
        minGuests: 50,
        priceAdult: 1000,
        priceChild: 500,
      });

      tx.$queryRaw.mockResolvedValue([
        {
          id: 101,
          code: 'WEDDING10K',
          type: 'FIXED_AMOUNT',
          value: 10000,
          active: true,
          validFrom: null,
          validUntil: null,
          usageLimit: 100,
          usageCount: 0,
          minBookingAmount: 0,
        },
      ]);

      const res = await service.createBooking(
        {
          date: '2026-11-20',
          type: EventType.WEDDING,
          packageId: 2,
          headCountAdult: 100, // 100 * 1000 = 100,000 subtotal
          headCountChild: 0,
          discountCode: 'WEDDING10K', // 10,000 fixed discount -> total = 90,000
        },
        10,
      );

      expect(res.subtotalAmount).toBe(100000);
      expect(res.discountAmount).toBe(10000);
      expect(res.totalAmount).toBe(90000);
      expect(res.advanceRequired).toBe(22500); // 25% of 90,000 = 22,500
    });

    it('should ignore client price tampering and calculate using DB prices', async () => {
      prisma.package.findUnique.mockResolvedValue({
        id: 1,
        name: 'Day Pass',
        slug: 'day-pass',
        minGuests: 1,
        priceAdult: 5000,
        priceChild: 0,
      });

      const res = await service.createBooking(
        {
          date: '2026-09-15',
          type: EventType.DAY_TOURISM,
          packageId: 1,
          headCountAdult: 1,
          headCountChild: 0,
          // Malicious payload attempts to trick backend!
          subtotalAmount: 100,
          discountAmount: 99,
          totalAmount: 1,
          advanceRequired: 1,
        } as any,
        10,
      );

      expect(res.subtotalAmount).toBe(5000);
      expect(res.discountAmount).toBe(0);
      expect(res.totalAmount).toBe(5000);
      expect(res.advanceRequired).toBe(5000);
    });

    it('should bound discountAmount to subtotal when fixed discount exceeds subtotal', async () => {
      prisma.package.findUnique.mockResolvedValue({
        id: 1,
        name: 'Day Pass',
        slug: 'day-pass',
        minGuests: 1,
        priceAdult: 1000,
        priceChild: 0,
      });

      tx.$queryRaw.mockResolvedValue([
        {
          id: 102,
          code: 'HUGE5000',
          type: 'FIXED_AMOUNT',
          value: 5000, // Exceeds subtotal of 1000
          active: true,
          validFrom: null,
          validUntil: null,
          usageLimit: 100,
          usageCount: 0,
        },
      ]);

      const res = await service.createBooking(
        {
          date: '2026-09-15',
          type: EventType.DAY_TOURISM,
          packageId: 1,
          headCountAdult: 1, // subtotal = 1000
          headCountChild: 0,
          discountCode: 'HUGE5000',
        },
        10,
      );

      expect(res.subtotalAmount).toBe(1000);
      expect(res.discountAmount).toBe(1000); // Bounded to 1000
      expect(res.totalAmount).toBe(0); // non-negative
      expect(res.advanceRequired).toBe(0);
    });
  });

  describe('Phase 13 — WhatsApp Payment QR & Post-Booking Automation', () => {
    const mockBooking = {
      id: 101,
      bookingNumber: 'RM-2026-000101',
      status: BookingStatus.APPROVED,
      totalAmount: 12000,
      advanceRequired: 3000,
      amountPaid: 0,
      balanceAmount: 12000,
      date: new Date('2026-10-15'),
      package: { name: 'Royal Celebration' },
      user: { id: 22, name: 'Aditi Sharma', email: 'aditi@example.com', phone: '+919876543210' },
    };

    describe('getPaymentQr', () => {
      it('should return authoritative financial summary, upiUri and qrDataUrl', async () => {
        prisma.booking.findUnique.mockResolvedValue(mockBooking);

        const result = await service.getPaymentQr(101);

        expect(result.bookingId).toBe(101);
        expect(result.bookingNumber).toBe('RM-2026-000101');
        expect(result.financials.amountRequested).toBe(3000);
        expect(result.financials.totalAmount).toBe(12000);
        expect(result.upiUri).toContain('upi://pay?');
        expect(result.qrDataUrl).toBe('data:image/png;base64,fake-qr-data');
      });

      it('should throw BadRequestException if booking does not exist', async () => {
        prisma.booking.findUnique.mockResolvedValue(null);

        await expect(service.getPaymentQr(999)).rejects.toThrow(BadRequestException);
      });
    });

    describe('sendPaymentRequest', () => {
      it('should send WhatsApp payment request with exact server-calculated amount and audit the action', async () => {
        prisma.booking.findUnique.mockResolvedValue(mockBooking);

        const result = await service.sendPaymentRequest(101, 1);

        expect(result.success).toBe(true);
        expect(mockUpiPaymentQrService.generatePaymentRequest).toHaveBeenCalledWith(mockBooking);
        expect(mockWhatsAppService.sendPaymentRequestWithQr).toHaveBeenCalled();
        expect(mockAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'PAYMENT_REQUEST_SENT',
            entityId: 101,
          }),
        );
      });

      it('should reject payment request if booking status is CANCELLED', async () => {
        prisma.booking.findUnique.mockResolvedValue({
          ...mockBooking,
          status: BookingStatus.CANCELLED,
        });

        await expect(service.sendPaymentRequest(101, 1)).rejects.toThrow(BadRequestException);
      });

      it('should reject payment request if balance is 0 and already settled', async () => {
        prisma.booking.findUnique.mockResolvedValue({
          ...mockBooking,
          amountPaid: 12000,
          balanceAmount: 0,
        });
        mockUpiPaymentQrService.generatePaymentRequest.mockRejectedValue(
          new BadRequestException('Booking has already been fully settled.'),
        );

        await expect(service.sendPaymentRequest(101, 1)).rejects.toThrow(BadRequestException);
      });
    });

    describe('confirmAvailability (Step 1 - Separated Action)', () => {
      it('should confirm availability from REQUESTED to APPROVED without sending payment request or QR', async () => {
        const requestedBooking = {
          ...mockBooking,
          status: BookingStatus.REQUESTED,
        };
        prisma.booking.findUnique.mockResolvedValue(requestedBooking);
        prisma.booking.update.mockResolvedValue({
          ...requestedBooking,
          status: BookingStatus.APPROVED,
        });

        const result = await service.confirmAvailability(101, 1);

        expect(result.status).toBe(BookingStatus.APPROVED);
        expect(mockAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CONFIRM_AVAILABILITY',
            entityId: 101,
            userId: 1,
            newValue: { status: BookingStatus.APPROVED },
          }),
        );

        // Crucial verification: Confirming availability MUST NOT call WhatsApp payment QR
        expect(mockWhatsAppService.sendPaymentRequestWithQr).not.toHaveBeenCalled();
        expect(mockUpiPaymentQrService.generatePaymentRequest).not.toHaveBeenCalled();
      });

      it('should confirm availability from UNDER_REVIEW to APPROVED', async () => {
        const underReviewBooking = {
          ...mockBooking,
          status: BookingStatus.UNDER_REVIEW,
        };
        prisma.booking.findUnique.mockResolvedValue(underReviewBooking);
        prisma.booking.update.mockResolvedValue({
          ...underReviewBooking,
          status: BookingStatus.APPROVED,
        });

        const result = await service.confirmAvailability(101, 2);
        expect(result.status).toBe(BookingStatus.APPROVED);
        expect(mockWhatsAppService.sendPaymentRequestWithQr).not.toHaveBeenCalled();
      });

      it('should reject confirmAvailability if booking is already APPROVED, CONFIRMED, or CANCELLED', async () => {
        prisma.booking.findUnique.mockResolvedValue({
          ...mockBooking,
          status: BookingStatus.APPROVED,
        });

        await expect(service.confirmAvailability(101, 1)).rejects.toThrow(
          BadRequestException,
        );

        prisma.booking.findUnique.mockResolvedValue({
          ...mockBooking,
          status: BookingStatus.CANCELLED,
        });

        await expect(service.confirmAvailability(101, 1)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('confirmAvailabilityAndRequestPayment', () => {
      it('should confirm availability from REQUESTED to APPROVED and dispatch payment QR', async () => {
        const requestedBooking = {
          ...mockBooking,
          status: BookingStatus.REQUESTED,
        };
        prisma.booking.findUnique
          .mockResolvedValueOnce(requestedBooking)
          .mockResolvedValueOnce({
            ...requestedBooking,
            status: BookingStatus.APPROVED,
          });
        prisma.booking.update.mockResolvedValue({
          ...requestedBooking,
          status: BookingStatus.APPROVED,
        });

        const result = await service.confirmAvailabilityAndRequestPayment(101, 1);

        expect(result.success).toBe(true);
        expect(result.booking.status).toBe(BookingStatus.PAYMENT_PENDING);
        expect(mockAuditService.logAction).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CONFIRM_AVAILABILITY',
            entityId: 101,
          }),
        );
      });

      it('should preserve booking status change even if WhatsApp delivery fails (decoupled failure resilience)', async () => {
        const requestedBooking = {
          ...mockBooking,
          status: BookingStatus.REQUESTED,
        };
        prisma.booking.findUnique
          .mockResolvedValueOnce(requestedBooking)
          .mockResolvedValueOnce({
            ...requestedBooking,
            status: BookingStatus.APPROVED,
          });
        prisma.booking.update.mockResolvedValue({
          ...requestedBooking,
          status: BookingStatus.APPROVED,
        });

        // WhatsApp fails
        mockWhatsAppService.sendPaymentRequestWithQr.mockResolvedValue({
          success: false,
          status: 'FAILED',
          error: 'Meta Cloud API 500 error',
        });

        const result = await service.confirmAvailabilityAndRequestPayment(101, 1);

        // Booking availability remains successfully approved and advanced to payment pending
        expect(result.booking.status).toBe(BookingStatus.PAYMENT_PENDING);
        expect(result.whatsapp.success).toBe(false);
      });
    });

    describe('Booking Idempotency & Concurrency Protection', () => {
      const basePayload: any = {
        date: '2026-10-15T10:00:00.000Z',
        type: EventType.DAY_TOURISM,
        packageId: 1,
        headCountAdult: 2,
        headCountChild: 0,
      };

      const mockPackage = {
        id: 1,
        name: 'Day Tourism Package',
        slug: 'day-tourism-package',
        minGuests: 1,
        priceAdult: 1000,
        priceChild: 500,
      };

      beforeEach(() => {
        prisma.package.findUnique.mockResolvedValue(mockPackage);
        prisma.resource.findMany.mockResolvedValue([
          { id: 1, name: 'General Day Tourism', active: true },
          { id: 2, name: 'Main Dining', active: true },
          { id: 3, name: 'Parking', active: true },
        ]);
        prisma.booking.count.mockResolvedValue(0);
        prisma.booking.findUnique.mockResolvedValue(null);
      });

      // A. same request submitted twice concurrently → one booking
      it('Scenario A: same request submitted twice concurrently → returns single created booking without duplicate operations', async () => {
        let createCallCount = 0;
        tx.booking.create.mockImplementation(async (args: any) => {
          createCallCount++;
          // Simulate real async DB transaction delay
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            id: 201,
            ...args.data,
          };
        });

        const req1 = service.createBooking({ ...basePayload, idempotencyKey: 'concurrent-key-abc' }, 10);
        const req2 = service.createBooking({ ...basePayload, idempotencyKey: 'concurrent-key-abc' }, 10);

        const [booking1, booking2] = await Promise.all([req1, req2]);

        expect(createCallCount).toBe(1);
        expect(tx.booking.create).toHaveBeenCalledTimes(1);
        expect(booking1.id).toBe(201);
        expect(booking2.id).toBe(201);
        expect(booking1.bookingNumber).toBe('RM-2026-000001');
        expect(booking2.bookingNumber).toBe('RM-2026-000001');
      });

      // B. same request retried → original result/idempotent behavior
      it('Scenario B: same request retried sequentially → returns original booking idempotently without duplicate creation', async () => {
        tx.booking.create.mockResolvedValue({
          id: 301,
          bookingNumber: 'RM-2026-000301',
          totalAmount: 2000,
          status: BookingStatus.REQUESTED,
        });

        const initial = await service.createBooking({ ...basePayload, idempotencyKey: 'retry-key-xyz' }, 10);
        expect(tx.booking.create).toHaveBeenCalledTimes(1);
        expect(initial.id).toBe(301);

        // Retry same request with identical idempotency key
        const retried = await service.createBooking({ ...basePayload, idempotencyKey: 'retry-key-xyz' }, 10);
        expect(tx.booking.create).toHaveBeenCalledTimes(1); // Still exactly 1
        expect(retried.id).toBe(301);
        expect(retried.bookingNumber).toBe('RM-2026-000301');
      });

      // C. two legitimate separate bookings with identical business details → both allowed
      it('Scenario C: two legitimate separate bookings with identical business details → both allowed', async () => {
        let createdId = 401;
        tx.booking.create.mockImplementation((args: any) => {
          return Promise.resolve({
            id: createdId++,
            bookingNumber: `RM-2026-000${createdId}`,
            ...args.data,
          });
        });

        // Booking 1: Customer Alice makes booking 1
        const booking1 = await service.createBooking(
          { ...basePayload, idempotencyKey: 'alice-session-order-1' },
          10,
        );

        // Booking 2: Customer Alice makes booking 2 with identical parameters in a new session
        const booking2 = await service.createBooking(
          { ...basePayload, idempotencyKey: 'alice-session-order-2' },
          10,
        );

        expect(tx.booking.create).toHaveBeenCalledTimes(2);
        expect(booking1.id).toBe(401);
        expect(booking2.id).toBe(402);
      });

      // D. different customers → both allowed
      it('Scenario D: different customers booking the same package and date → both allowed', async () => {
        let createdId = 501;
        tx.booking.create.mockImplementation((args: any) => {
          return Promise.resolve({
            id: createdId++,
            bookingNumber: `RM-2026-000${createdId}`,
            ...args.data,
          });
        });

        // Customer 1
        const bookingCust1 = await service.createBooking(
          { ...basePayload, guestName: 'Customer One', idempotencyKey: 'cust-1-order-uuid' },
          10,
        );

        // Customer 2 (same package, date, guests)
        const bookingCust2 = await service.createBooking(
          { ...basePayload, guestName: 'Customer Two', idempotencyKey: 'cust-2-order-uuid' },
          20,
        );

        expect(tx.booking.create).toHaveBeenCalledTimes(2);
        expect(bookingCust1.id).toBe(501);
        expect(bookingCust2.id).toBe(502);
      });

      // E. existing discount usage behavior remains correct
      it('Scenario E: discount code usage count incremented exactly once across duplicate submissions', async () => {
        const mockDiscount = {
          id: 5,
          code: 'SUMMER20',
          active: true,
          type: 'PERCENTAGE',
          value: 20,
          usageCount: 1,
          usageLimit: 10,
          perCustomerLimit: 1,
          applicablePackages: ['1', 'day-tourism-package'],
        };

        tx.$queryRaw.mockResolvedValue([mockDiscount]);
        tx.booking.count.mockResolvedValue(0);
        tx.booking.create.mockResolvedValue({
          id: 601,
          bookingNumber: 'RM-2026-000601',
          discountCode: 'SUMMER20',
          discountAmount: 400,
          totalAmount: 1600,
          status: BookingStatus.REQUESTED,
        });

        const payloadWithDiscount = {
          ...basePayload,
          discountCode: 'SUMMER20',
          idempotencyKey: 'discount-idemp-key',
        };

        // Submit first time
        const res1 = await service.createBooking(payloadWithDiscount, 10);
        // Duplicate submission with same idempotency key
        const res2 = await service.createBooking(payloadWithDiscount, 10);

        expect(res1.id).toBe(601);
        expect(res2.id).toBe(601);
        // Discount usage count must be updated exactly ONCE
        expect(tx.discount.update).toHaveBeenCalledTimes(1);
        expect(tx.discount.update).toHaveBeenCalledWith({
          where: { id: 5 },
          data: { usageCount: { increment: 1 } },
        });
      });
    });
  });
});

