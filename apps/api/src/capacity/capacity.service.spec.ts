import { Test, TestingModule } from '@nestjs/testing';
import { CapacityService, ACTIVE_BOOKING_STATUSES } from './capacity.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { normalizeToIstDateRange } from '../common/utils/date.util';

describe('CapacityService (Phase 18B Overrides & Blackout Engine)', () => {
  let service: CapacityService;
  let mockPrisma: any;
  let mockAuditService: any;

  const sampleResources = [
    { id: 1, name: 'General Day Tourism', type: 'CAPACITY', capacity: 500, active: true },
    { id: 2, name: 'Main Dining', type: 'VENUE', capacity: 200, active: true },
  ];

  beforeEach(async () => {
    mockAuditService = {
      logAction: jest.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      resource: {
        findMany: jest.fn().mockResolvedValue(sampleResources),
      },
      bookingResource: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 150 } }),
        count: jest.fn().mockResolvedValue(12),
      },
      dailyCapacityOverride: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 1, ...args.data })),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
        delete: jest.fn().mockResolvedValue({ id: 1 }),
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
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<CapacityService>(CapacityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('1. Normal Capacity (Without Override)', () => {
    it('uses static resource capacity when no override exists', async () => {
      const result = await service.getAvailabilityReport('2026-09-09');

      expect(result.isClosed).toBe(false);
      expect(result.hasOverride).toBe(false);
      expect(result.resources[0].totalCapacity).toBe(500);
      expect(result.resources[0].bookedCapacity).toBe(150);
      expect(result.resources[0].remainingCapacity).toBe(350);
      expect(result.resources[0].isAvailable).toBe(true);
      expect(result.resources[0].hasOverride).toBe(false);
    });
  });

  describe('2. Increased & Decreased Capacity Overrides', () => {
    it('increases capacity when customCapacity is greater than default (e.g. 700 pax)', async () => {
      mockPrisma.dailyCapacityOverride.findFirst.mockResolvedValueOnce({
        id: 10,
        date: new Date('2026-09-08T18:30:00.000Z'),
        customCapacity: 700,
        isClosed: false,
        reason: 'Extra festival tents deployed',
      });

      const result = await service.getAvailabilityReport('2026-09-09');

      expect(result.hasOverride).toBe(true);
      expect(result.resources[0].totalCapacity).toBe(700);
      expect(result.resources[0].originalCapacity).toBe(500);
      expect(result.resources[0].remainingCapacity).toBe(550); // 700 - 150
      expect(result.resources[0].hasOverride).toBe(true);
      // Secondary resources remain at their standard capacity
      expect(result.resources[1].totalCapacity).toBe(200);
    });

    it('decreases capacity when customCapacity is less than default (e.g. 50 pax)', async () => {
      mockPrisma.dailyCapacityOverride.findFirst.mockResolvedValueOnce({
        id: 11,
        date: new Date('2026-09-08T18:30:00.000Z'),
        customCapacity: 50,
        isClosed: false,
        reason: 'Partial lawn maintenance',
      });

      // 150 booked > 50 custom capacity -> remaining capacity = 0
      const result = await service.getAvailabilityReport('2026-09-09');

      expect(result.resources[0].totalCapacity).toBe(50);
      expect(result.resources[0].remainingCapacity).toBe(0);
      expect(result.resources[0].isAvailable).toBe(false);
    });
  });

  describe('3. Blackout / Closed Dates', () => {
    it('marks all resources as unavailable with closureReason when date isClosed', async () => {
      mockPrisma.dailyCapacityOverride.findFirst.mockResolvedValueOnce({
        id: 12,
        date: new Date('2026-09-08T18:30:00.000Z'),
        customCapacity: null,
        isClosed: true,
        reason: 'Private corporate resort buyout',
      });

      const result = await service.getAvailabilityReport('2026-09-09');

      expect(result.isClosed).toBe(true);
      expect(result.closureReason).toBe('Private corporate resort buyout');
      expect(result.resources[0].isAvailable).toBe(false);
      expect(result.resources[0].remainingCapacity).toBe(0);
      expect(result.resources[1].isAvailable).toBe(false);
      expect(result.resources[1].remainingCapacity).toBe(0);
    });

    it('validateAndLockCapacity throws ConflictException with blackout reason on closed dates', async () => {
      const mockTx: any = {
        dailyCapacityOverride: {
          findFirst: jest.fn().mockResolvedValue({
            id: 12,
            isClosed: true,
            reason: 'Annual infrastructure maintenance',
          }),
        },
      };

      await expect(
        service.validateAndLockCapacity(mockTx, '2026-09-09', [{ resourceId: 1, quantity: 5 }])
      ).rejects.toThrow('Sorry, River Mist is closed on 2026-09-09: Annual infrastructure maintenance.');
    });
  });

  describe('4. Override Precedence during Booking Validation', () => {
    let mockTx: any;

    beforeEach(() => {
      mockTx = {
        dailyCapacityOverride: {
          findFirst: jest.fn(),
        },
        $queryRaw: jest.fn().mockResolvedValue([
          { id: 1, name: 'General Day Tourism', type: 'CAPACITY', capacity: 500, active: true },
        ]),
        bookingResource: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 180 } }),
        },
      };
    });

    it('enforces override custom capacity over default capacity in transactions (rejects when exceeding override)', async () => {
      // Default capacity = 500. Override capacity = 200.
      // Existing booked = 180. Requested = 25. 180 + 25 = 205 > 200 -> FAILS (even though 205 < 500)!
      mockTx.dailyCapacityOverride.findFirst.mockResolvedValueOnce({
        id: 15,
        customCapacity: 200,
        isClosed: false,
      });

      await expect(
        service.validateAndLockCapacity(mockTx, '2026-09-09', [{ resourceId: 1, quantity: 25 }])
      ).rejects.toThrow('Sorry, the selected date is currently unavailable for General Day Tourism. (Available: 20, Requested: 25)');
    });

    it('allows booking when within override custom capacity even if over original limit', async () => {
      // Default capacity = 500. Override capacity = 800.
      // Existing booked = 550. Requested = 50. 550 + 50 = 600 <= 800 -> SUCCEEDS!
      mockTx.dailyCapacityOverride.findFirst.mockResolvedValueOnce({
        id: 16,
        customCapacity: 800,
        isClosed: false,
      });
      mockTx.bookingResource.aggregate.mockResolvedValueOnce({ _sum: { quantity: 550 } });

      const result = await service.validateAndLockCapacity(mockTx, '2026-09-09', [{ resourceId: 1, quantity: 50 }]);
      expect(result).toBe(true);
    });
  });

  describe('5. IST Date Boundary & Range Accuracy', () => {
    it('queries daily overrides using exact IST boundaries [startOfDay, endOfDay)', async () => {
      const dateStr = '2026-09-09';
      const expectedRange = normalizeToIstDateRange(dateStr);

      await service.getAvailabilityReport(dateStr);

      expect(mockPrisma.dailyCapacityOverride.findFirst).toHaveBeenCalledWith({
        where: {
          date: {
            gte: expectedRange.startOfDay,
            lt: expectedRange.endOfDay,
          },
        },
      });
    });
  });

  describe('6. Admin Override Management & Audit Logging', () => {
    it('creates a new override and writes to AuditLog', async () => {
      const dto = {
        date: '2026-10-15',
        customCapacity: 300,
        isClosed: false,
        reason: 'Diwali special capacity',
      };

      const result = await service.setDailyOverride(dto, 99);

      expect(mockPrisma.dailyCapacityOverride.create).toHaveBeenCalled();
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'DAILY_CAPACITY_OVERRIDE',
          entityKey: '2026-10-15',
          userId: 99,
        })
      );
      expect(result.customCapacity).toBe(300);
    });

    it('updates an existing override and writes to AuditLog', async () => {
      mockPrisma.dailyCapacityOverride.findFirst.mockResolvedValueOnce({
        id: 42,
        date: new Date('2026-10-14T18:30:00.000Z'),
        customCapacity: 300,
        isClosed: false,
        reason: 'Diwali special capacity',
      });

      const dto = {
        date: '2026-10-15',
        isClosed: true,
        reason: 'Changed to private event',
      };

      const result = await service.setDailyOverride(dto, 99);

      expect(mockPrisma.dailyCapacityOverride.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: expect.objectContaining({ isClosed: true }),
      });
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entity: 'DAILY_CAPACITY_OVERRIDE',
          entityId: 42,
          userId: 99,
        })
      );
      expect(result.isClosed).toBe(true);
    });

    it('deletes an override and writes to AuditLog', async () => {
      mockPrisma.dailyCapacityOverride.findUnique.mockResolvedValueOnce({
        id: 42,
        date: new Date('2026-10-14T18:30:00.000Z'),
        customCapacity: 300,
        isClosed: true,
        reason: 'Some reason',
      });

      const result = await service.deleteDailyOverride(42, 99);

      expect(mockPrisma.dailyCapacityOverride.delete).toHaveBeenCalledWith({ where: { id: 42 } });
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entity: 'DAILY_CAPACITY_OVERRIDE',
          entityId: 42,
          userId: 99,
        })
      );
      expect(result).toEqual({ success: true, id: 42 });
    });

    it('throws NotFoundException when deleting non-existent override', async () => {
      mockPrisma.dailyCapacityOverride.findUnique.mockResolvedValueOnce(null);

      await expect(service.deleteDailyOverride(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('7. Validation on Inputs', () => {
    it('throws BadRequestException if customCapacity is negative', async () => {
      await expect(
        service.setDailyOverride({ date: '2026-09-09', customCapacity: -10 })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if neither customCapacity nor isClosed nor reason provided', async () => {
      await expect(
        service.setDailyOverride({ date: '2026-09-09' })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
