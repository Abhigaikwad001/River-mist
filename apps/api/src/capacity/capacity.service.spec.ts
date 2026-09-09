import { Test, TestingModule } from '@nestjs/testing';
import { CapacityService, ACTIVE_BOOKING_STATUSES } from './capacity.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { normalizeToIstDateRange } from '../common/utils/date.util';

describe('CapacityService (Phase 18A IST Boundaries)', () => {
  let service: CapacityService;
  let mockPrisma: any;

  const sampleResources = [
    { id: 1, name: 'General Day Tourism', type: 'CAPACITY', capacity: 500, active: true },
    { id: 2, name: 'Main Dining', type: 'VENUE', capacity: 200, active: true },
  ];

  beforeEach(async () => {
    mockPrisma = {
      resource: {
        findMany: jest.fn().mockResolvedValue(sampleResources),
      },
      bookingResource: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 150 } }),
        count: jest.fn().mockResolvedValue(12),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapacityService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CapacityService>(CapacityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailabilityReport with Authoritative IST Boundaries', () => {
    it('queries bookingResource within exact IST startOfDay and endOfDay for date-only string', async () => {
      const dateStr = '2026-09-09';
      const expectedRange = normalizeToIstDateRange(dateStr);

      const result = await service.getAvailabilityReport(dateStr);

      expect(mockPrisma.resource.findMany).toHaveBeenCalledWith({ where: { active: true } });

      // Verify aggregate query uses half-open interval [startOfDay, endOfDay)
      expect(mockPrisma.bookingResource.aggregate).toHaveBeenCalledWith({
        where: {
          resourceId: 1,
          booking: {
            date: {
              gte: expectedRange.startOfDay,
              lt: expectedRange.endOfDay,
            },
            status: {
              in: ACTIVE_BOOKING_STATUSES,
            },
          },
        },
        _sum: {
          quantity: true,
        },
      });

      // Verify count query uses same half-open interval
      expect(mockPrisma.bookingResource.count).toHaveBeenCalledWith({
        where: {
          resourceId: 1,
          booking: {
            date: {
              gte: expectedRange.startOfDay,
              lt: expectedRange.endOfDay,
            },
            status: {
              in: ACTIVE_BOOKING_STATUSES,
            },
          },
        },
      });

      expect(result.date).toBe('2026-09-09');
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]).toEqual({
        resourceId: 1,
        resourceName: 'General Day Tourism',
        type: 'CAPACITY',
        totalCapacity: 500,
        bookedCapacity: 150,
        remainingCapacity: 350,
        bookingCount: 12,
        isAvailable: true,
      });
    });

    it('queries using identical IST boundaries whether given YYYY-MM-DD or UTC ISO timestamp', async () => {
      const dateOnly = '2026-09-09';
      const utcIso = '2026-09-09T00:00:00.000Z'; // 05:30 IST on Sep 9

      await service.getAvailabilityReport(dateOnly);
      const callDateOnly = mockPrisma.bookingResource.aggregate.mock.calls[0][0].where.booking.date;

      mockPrisma.bookingResource.aggregate.mockClear();

      await service.getAvailabilityReport(utcIso);
      const callUtcIso = mockPrisma.bookingResource.aggregate.mock.calls[0][0].where.booking.date;

      expect(callDateOnly.gte.toISOString()).toBe('2026-09-08T18:30:00.000Z');
      expect(callDateOnly.lt.toISOString()).toBe('2026-09-09T18:30:00.000Z');
      expect(callUtcIso.gte.toISOString()).toBe(callDateOnly.gte.toISOString());
      expect(callUtcIso.lt.toISOString()).toBe(callDateOnly.lt.toISOString());
    });

    it('marks resource as not available when remainingCapacity is 0', async () => {
      mockPrisma.bookingResource.aggregate.mockResolvedValueOnce({ _sum: { quantity: 500 } });

      const result = await service.getAvailabilityReport('2026-09-09');

      expect(result.resources[0].remainingCapacity).toBe(0);
      expect(result.resources[0].isAvailable).toBe(false);
    });
  });

  describe('validateAndLockCapacity with Authoritative IST Boundaries', () => {
    let mockTx: any;

    beforeEach(() => {
      mockTx = {
        $queryRaw: jest.fn().mockResolvedValue([
          { id: 1, name: 'General Day Tourism', capacity: 500, active: true },
        ]),
        bookingResource: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 480 } }),
        },
      };
    });

    it('validates capacity within the exact IST business day window and passes when capacity permits', async () => {
      const targetDate = new Date('2026-09-08T18:30:00.000Z'); // Exact IST midnight of Sep 9
      const expectedRange = normalizeToIstDateRange(targetDate);

      const result = await service.validateAndLockCapacity(mockTx, targetDate, [
        { resourceId: 1, quantity: 20 }, // 480 + 20 = 500 (exact capacity)
      ]);

      expect(result).toBe(true);
      expect(mockTx.bookingResource.aggregate).toHaveBeenCalledWith({
        where: {
          resourceId: 1,
          booking: {
            date: {
              gte: expectedRange.startOfDay,
              lt: expectedRange.endOfDay,
            },
            status: {
              in: ACTIVE_BOOKING_STATUSES,
            },
          },
        },
        _sum: {
          quantity: true,
        },
      });
    });

    it('throws ConflictException when booked + requested exceeds resource capacity', async () => {
      const targetDate = new Date('2026-09-09T12:00:00.000Z');

      await expect(
        service.validateAndLockCapacity(mockTx, targetDate, [
          { resourceId: 1, quantity: 25 }, // 480 + 25 = 505 > 500
        ])
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if resource row does not exist or is inactive', async () => {
      mockTx.$queryRaw.mockResolvedValueOnce([]);

      await expect(
        service.validateAndLockCapacity(mockTx, '2026-09-09', [
          { resourceId: 999, quantity: 10 },
        ])
      ).rejects.toThrow(ConflictException);
    });
  });
});
