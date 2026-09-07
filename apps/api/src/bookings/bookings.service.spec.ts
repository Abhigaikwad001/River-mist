import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CapacityService } from '../capacity/capacity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException } from '@nestjs/common';
import { EventType, BookingStatus } from '@prisma/client';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: any;
  let tx: any;

  beforeEach(async () => {
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
        findUnique: jest.fn(),
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
});
