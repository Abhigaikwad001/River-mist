import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CapacityService } from '../capacity/capacity.service';
import { EventType, BookingStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

describe('Pricing Engine (Phase 4)', () => {
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
        update: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 99 }),
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
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return await callback(tx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: CapacityService,
          useValue: {
            validateAndLockCapacity: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendBookingRequested: jest.fn().mockResolvedValue(true),
            sendBookingStatusUpdated: jest.fn().mockResolvedValue(true),
            sendPaymentStatus: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    
    // Set a predictable tax rate
    process.env.TAX_RATE = '0.18';
  });

  afterEach(() => {
    delete process.env.TAX_RATE;
  });

  it('should calculate correct total for adults and children without discount', async () => {
    prisma.package.findUnique.mockResolvedValue({
      id: 1,
      minGuests: 2,
      priceAdult: 1000,
      priceChild: 500,
    });

    const booking = await service.createBooking({
      date: new Date().toISOString(),
      type: EventType.DAY_TOURISM,
      packageId: 1,
      headCountAdult: 2,
      headCountChild: 1,
    });

    // Subtotal: 2000 + 500 = 2500
    // Tax (18%): 450
    // Total: 2950
    expect(booking.totalAmount).toBe(2950);
    // Day tourism -> 100% advance
    expect(booking.advanceRequired).toBe(2950);
  });

  it('should apply percentage discount correctly', async () => {
    prisma.package.findUnique.mockResolvedValue({
      id: 1,
      minGuests: 1,
      priceAdult: 1000,
      priceChild: 0,
    });

    tx.$queryRaw.mockResolvedValue([{
      id: 1,
      code: 'SAVE10',
      active: true,
      type: 'PERCENTAGE',
      value: 10,
      usageLimit: null,
      usageCount: 0,
    }]);

    const booking = await service.createBooking({
      date: new Date().toISOString(),
      type: EventType.DAY_TOURISM,
      packageId: 1,
      headCountAdult: 1,
      headCountChild: 0,
      discountCode: 'SAVE10',
    });

    // Subtotal: 1000
    // Discount: 10% = 100
    // Post-discount: 900
    // Tax (18%): 162
    // Total: 1062
    expect(booking.totalAmount).toBe(1062);
    expect(tx.discount.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { usageCount: { increment: 1 } }
    });
  });

  it('should apply fixed discount correctly', async () => {
    prisma.package.findUnique.mockResolvedValue({
      id: 1,
      minGuests: 1,
      priceAdult: 1000,
      priceChild: 0,
    });

    tx.$queryRaw.mockResolvedValue([{
      id: 1,
      code: 'FLAT500',
      active: true,
      type: 'FIXED',
      value: 500,
      usageLimit: null,
      usageCount: 0,
    }]);

    const booking = await service.createBooking({
      date: new Date().toISOString(),
      type: EventType.DAY_TOURISM,
      packageId: 1,
      headCountAdult: 1,
      headCountChild: 0,
      discountCode: 'FLAT500',
    });

    // Subtotal: 1000
    // Discount: 500
    // Post-discount: 500
    // Tax (18%): 90
    // Total: 590
    expect(booking.totalAmount).toBe(590);
  });

  it('should fail if discount usage limit is reached', async () => {
    prisma.package.findUnique.mockResolvedValue({
      id: 1,
      minGuests: 1,
      priceAdult: 1000,
      priceChild: 0,
    });

    tx.$queryRaw.mockResolvedValue([{
      id: 1,
      code: 'LIMITED',
      active: true,
      type: 'FIXED',
      value: 500,
      usageLimit: 10,
      usageCount: 10, // Limit reached
    }]);

    await expect(service.createBooking({
      date: new Date().toISOString(),
      type: EventType.DAY_TOURISM,
      packageId: 1,
      headCountAdult: 1,
      headCountChild: 0,
      discountCode: 'LIMITED',
    })).rejects.toThrow(BadRequestException);
  });

  it('should properly calculate PER_PERSON and FIXED activities', async () => {
    prisma.package.findUnique.mockResolvedValue({
      id: 1,
      minGuests: 1,
      priceAdult: 1000,
      priceChild: 0,
    });

    prisma.activity.findMany.mockResolvedValue([
      { id: 10, price: 100, pricingType: 'PER_PERSON' },
      { id: 11, price: 500, pricingType: 'FIXED' }
    ]);

    const booking = await service.createBooking({
      date: new Date().toISOString(),
      type: EventType.DAY_TOURISM,
      packageId: 1,
      headCountAdult: 2,
      headCountChild: 0,
      activityIds: [10, 11]
    });

    // Package: 2000
    // Activities: (2 * 100) + 500 = 700
    // Subtotal: 2700
    // Tax (18%): 486
    // Total: 3186
    expect(booking.totalAmount).toBe(3186);
  });

  it('should ignore any frontend price fields if they were somehow passed (simulate by ignoring)', async () => {
    prisma.package.findUnique.mockResolvedValue({
      id: 1,
      minGuests: 1,
      priceAdult: 1000,
      priceChild: 0,
    });

    // We cast to any to simulate malicious payload getting past DTO (just checking service layer resilience)
    const maliciousPayload = {
      date: new Date().toISOString(),
      type: EventType.DAY_TOURISM,
      packageId: 1,
      headCountAdult: 1,
      headCountChild: 0,
      priceAdult: 1, // Malicious
      totalAmount: 10, // Malicious
    } as any;

    const booking = await service.createBooking(maliciousPayload);

    // Subtotal: 1000
    // Tax: 180
    // Total: 1180
    // Malicious prices must be ignored completely
    expect(booking.totalAmount).toBe(1180);
  });

  it('should require 25% advance for Weddings', async () => {
    prisma.package.findUnique.mockResolvedValue({
      id: 1,
      minGuests: 1,
      priceAdult: 1000,
      priceChild: 0,
    });

    process.env.TAX_RATE = '0'; // simplify math

    const booking = await service.createBooking({
      date: new Date().toISOString(),
      type: EventType.WEDDING,
      packageId: 1,
      headCountAdult: 100,
      headCountChild: 0,
    });

    // Subtotal: 100,000
    // Total: 100,000
    // Advance: 25,000
    expect(booking.totalAmount).toBe(100000);
    expect(booking.advanceRequired).toBe(25000);
  });
});
