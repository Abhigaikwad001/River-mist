import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesService } from './resources.service';
import { CapacityService } from '../capacity/capacity.service';
import { BookingsService } from '../bookings/bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpiPaymentQrService } from '../payments/qr/upi-payment-qr.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { Role, EventType } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

describe('Phase 18F: Resources Management & Auditability Integration Tests', () => {
  let resourcesService: ResourcesService;
  let capacityService: CapacityService;
  let bookingsService: BookingsService;
  let mockPrisma: any;
  let mockAuditService: any;
  let mockNotificationsService: any;
  let mockUpiPaymentQrService: any;
  let mockWhatsAppService: any;

  const superAdmin = { id: 1, email: 'admin@rivermist.com', role: Role.SUPER_ADMIN };
  const bookingManager = { id: 2, email: 'manager@rivermist.com', role: Role.BOOKING_MANAGER };

  beforeEach(async () => {
    mockAuditService = {
      logAction: jest.fn().mockResolvedValue({ id: 100 }),
    };

    mockNotificationsService = {
      sendBookingRequested: jest.fn().mockResolvedValue(undefined),
      sendBookingStatusUpdated: jest.fn().mockResolvedValue(undefined),
    };

    mockUpiPaymentQrService = {
      generatePaymentRequest: jest.fn().mockResolvedValue({
        amount: 3000,
        upiUri: 'upi://pay?mock',
        qrDataUrl: 'data:image/png;base64,mock',
      }),
    };

    mockWhatsAppService = {
      sendPaymentRequestWithQr: jest.fn().mockResolvedValue({ success: true }),
    };

    mockPrisma = {
      resource: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      bookingResource: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn(),
      },
      dailyCapacityOverride: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      booking: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      weddingQuote: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      package: {
        findUnique: jest.fn(),
      },
      activity: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 99, email: 'guest@example.com' }),
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        CapacityService,
        BookingsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
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

    resourcesService = module.get<ResourcesService>(ResourcesService);
    capacityService = module.get<CapacityService>(CapacityService);
    bookingsService = module.get<BookingsService>(BookingsService);
  });

  describe('1. Inactive Resource Handling & Capacity Reservation', () => {
    it('should reject booking/capacity lock if target resource is deactivated', async () => {
      const mockTx = {
        dailyCapacityOverride: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        $queryRaw: jest.fn().mockResolvedValue([
          // Inactive resource returned from query lock
          { id: 1, name: 'General Day Tourism', type: 'CAPACITY', capacity: 500, active: false },
        ]),
        bookingResource: { aggregate: jest.fn() },
      };

      await expect(
        capacityService.validateAndLockCapacity(mockTx as any, new Date('2026-10-15T00:00:00Z'), [
          { resourceId: 1, quantity: 50 },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('should exclude inactive resources from public capacity availability', async () => {
      // Mock capacity report with only active resources
      mockPrisma.resource.findMany.mockResolvedValue([
        { id: 2, name: 'Main Dining', type: 'DINING', capacity: 200, active: true },
      ]);
      mockPrisma.bookingResource.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });
      mockPrisma.bookingResource.count.mockResolvedValue(1);

      const report = await capacityService.getAvailabilityReport('2026-10-15');

      // The findMany query must filter by active: true
      expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
      expect(report.resources).toHaveLength(1);
      expect(report.resources[0].resourceId).toBe(2);
    });
  });

  describe('2. Renamed Resources Resilience', () => {
    it('should successfully resolve primary venue even if renamed when type is CAPACITY or VENUE', async () => {
      // Admin renamed "General Day Tourism" to "River Mist Grounds"
      const renamedResources = [
        { id: 1, name: 'River Mist Grounds', type: 'CAPACITY', capacity: 500, active: true },
        { id: 2, name: 'Mist Restaurant', type: 'DINING', capacity: 200, active: true },
        { id: 3, name: 'North Parking', type: 'PARKING', capacity: 100, active: true },
      ];
      mockPrisma.resource.findMany.mockResolvedValue(renamedResources);
      mockPrisma.package.findUnique.mockResolvedValue({
        id: 1,
        name: 'Standard Visit',
        minGuests: 1,
        priceAdult: 1000,
        priceChild: 500,
      });

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          booking: {
            create: jest.fn().mockResolvedValue({ id: 101, bookingNumber: 'RM-2026-000001' }),
          },
        };
        // validateAndLockCapacity mock
        jest.spyOn(capacityService, 'validateAndLockCapacity').mockResolvedValue(undefined as any);
        return cb(tx);
      });

      const result = await bookingsService.createBooking({
        packageId: 1,
        date: '2026-10-20',
        headCountAdult: 2,
        headCountChild: 0,
        type: EventType.DAY_TOURISM,
      });

      expect(capacityService.validateAndLockCapacity).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.arrayContaining([
          { resourceId: 1, quantity: 2 }, // Resolved renamed resource id 1!
          { resourceId: 2, quantity: 2 }, // Resolved renamed dining id 2!
          { resourceId: 3, quantity: 1 }, // Resolved renamed parking id 3!
        ]),
      );
      expect(result).toBeDefined();
    });
  });

  describe('3. Resource Capacity Changes & Immediate Availability Effect', () => {
    it('should reflect updated capacity immediately in capacity reports', async () => {
      // Simulate capacity updated from 500 to 750
      mockPrisma.resource.findMany.mockResolvedValue([
        { id: 1, name: 'General Day Tourism', type: 'CAPACITY', capacity: 750, active: true },
      ]);
      mockPrisma.bookingResource.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
      mockPrisma.bookingResource.count.mockResolvedValue(5);

      const report = await capacityService.getAvailabilityReport('2026-10-20');

      expect(report.resources[0].totalCapacity).toBe(750);
      expect(report.resources[0].remainingCapacity).toBe(650); // 750 - 100
    });
  });

  describe('4. Historical BookingResource Integrity on Deactivation', () => {
    it('should safely soft-deactivate and preserve existing BookingResource foreign keys', async () => {
      const resourceWithBookings = {
        id: 3,
        name: 'Wedding Lawn',
        type: 'VENUE',
        capacity: 1000,
        active: true,
        _count: { bookingResources: 42 },
      };
      mockPrisma.resource.findUnique.mockResolvedValue(resourceWithBookings);
      mockPrisma.resource.update.mockResolvedValue({ ...resourceWithBookings, active: false });

      const response = await resourcesService.deleteResource(3, superAdmin, '192.168.1.1');

      // Crucial: Must NOT delete from DB
      expect(mockPrisma.resource.delete).not.toHaveBeenCalled();
      // Must set active = false
      expect(mockPrisma.resource.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { active: false },
        include: { _count: { select: { bookingResources: true } } },
      });
      expect(response.deactivated).toBe(true);
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESOURCE_DEACTIVATED',
          metadata: expect.objectContaining({ historicalBookingCount: 42 }),
        }),
      );
    });
  });

  describe('5. Concurrency Behavior & Parallel Resource Operations', () => {
    it('should handle concurrent resource update requests deterministically', async () => {
      const existing = {
        id: 4,
        name: 'Conference Room A',
        type: 'VENUE',
        capacity: 30,
        active: true,
        _count: { bookingResources: 0 },
      };
      mockPrisma.resource.findUnique.mockResolvedValue(existing);
      mockPrisma.resource.update.mockImplementation((args: any) =>
        Promise.resolve({ ...existing, ...args.data }),
      );

      // Simulate 5 simultaneous capacity updates
      const promises = [
        resourcesService.updateResource(4, { capacity: 35 }, superAdmin),
        resourcesService.updateResource(4, { capacity: 40 }, superAdmin),
        resourcesService.updateResource(4, { description: 'Updated A' }, bookingManager),
        resourcesService.updateResource(4, { description: 'Updated B' }, superAdmin),
        resourcesService.updateResource(4, { capacity: 45 }, bookingManager),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockPrisma.resource.update).toHaveBeenCalledTimes(5);
      expect(mockAuditService.logAction).toHaveBeenCalledTimes(5);
    });
  });
});
