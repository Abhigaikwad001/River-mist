import { Test, TestingModule } from '@nestjs/testing';
import { CapacityService } from './capacity.service';
import { CapacityController } from './capacity.controller';
import { AdminController } from '../admin/admin.controller';
import { AdminService } from '../admin/admin.service';
import { BookingsService } from '../bookings/bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/roles.guard';
import { Role, BookingStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/roles.decorator';

describe('Admin Calendar & Capacity Control Center (Phase 18E)', () => {
  let capacityService: CapacityService;
  let bookingsService: BookingsService;
  let capacityController: CapacityController;
  let adminController: AdminController;
  let reflector: Reflector;

  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(async () => {
    mockAudit = {
      logAction: jest.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      dailyCapacityOverride: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      event: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      weddingQuote: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      resource: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          name: 'General Day Tourism',
          type: 'CAPACITY',
          capacity: 500,
          active: true,
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, name: 'General Day Tourism', type: 'CAPACITY', capacity: 500, active: true },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CapacityController, AdminController],
      providers: [
        CapacityService,
        Reflector,
        RolesGuard,
        {
          provide: AdminService,
          useValue: {
            getDashboardSummary: jest.fn(),
            getDashboardStats: jest.fn(),
            getRevenue: jest.fn(),
          },
        },
        {
          provide: BookingsService,
          useValue: {
            getAllBookings: jest.fn().mockImplementation((start, end) => {
              if (start && end) {
                return mockPrisma.booking.findMany({
                  where: { date: { gte: new Date(start), lt: new Date(end) } },
                });
              }
              return mockPrisma.booking.findMany();
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditService,
          useValue: mockAudit,
        },
      ],
    }).compile();

    capacityService = module.get<CapacityService>(CapacityService);
    bookingsService = module.get<BookingsService>(BookingsService);
    capacityController = module.get<CapacityController>(CapacityController);
    adminController = module.get<AdminController>(AdminController);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('1. Date-Range Validation & Constraints', () => {
    it('throws BadRequestException if startDate or endDate is missing', async () => {
      await expect(capacityService.getCalendarReport('', '2026-09-30')).rejects.toThrow(BadRequestException);
      await expect(capacityService.getCalendarReport('2026-09-01', '')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if startDate or endDate has invalid format', async () => {
      await expect(capacityService.getCalendarReport('invalid-date', '2026-09-30')).rejects.toThrow(BadRequestException);
      await expect(capacityService.getCalendarReport('2026-02-30', '2026-09-30')).rejects.toThrow('Invalid calendar date');
    });

    it('throws BadRequestException if startDate is after endDate', async () => {
      await expect(capacityService.getCalendarReport('2026-09-30', '2026-09-01')).rejects.toThrow(
        'startDate cannot be after endDate'
      );
    });

    it('throws BadRequestException if date range exceeds 62 days (2 months limit)', async () => {
      await expect(capacityService.getCalendarReport('2026-01-01', '2026-04-01')).rejects.toThrow(
        'Date range cannot exceed 62 days'
      );
    });
  });

  describe('2. IST Boundaries Across Midnight', () => {
    it('groups bookings by canonical IST calendar date even when stored with UTC offset timestamps', async () => {
      // UTC 2026-09-08T18:31:00.000Z is 2026-09-09 00:01:00 AM in IST (UTC+05:30)
      const bookingMidnightIst = {
        id: 101,
        bookingNumber: 'RM-TEST-MIDNIGHT',
        date: new Date('2026-09-08T18:31:00.000Z'),
        type: 'DAY_TOURISM',
        status: BookingStatus.CONFIRMED,
        headCountAdult: 4,
        headCountChild: 1,
        user: { id: 1, name: 'Midnight Guest', email: 'midnight@test.com', phone: '9999999999' },
        package: { id: 1, name: 'Day Standard', slug: 'day-standard' },
        activities: [],
        payments: [],
      };

      mockPrisma.booking.findMany.mockResolvedValueOnce([bookingMidnightIst]);

      const report = await capacityService.getCalendarReport('2026-09-09', '2026-09-09');

      expect(report.totalDays).toBe(1);
      const dayReport = report.days['2026-09-09'];
      expect(dayReport).toBeDefined();
      expect(dayReport.totalBookings).toBe(1);
      expect(dayReport.totalGuests).toBe(5);
      expect(dayReport.bookings[0].bookingNumber).toBe('RM-TEST-MIDNIGHT');
      expect(dayReport.bookings[0].date).toBe('2026-09-09');
    });
  });

  describe('3. Visibility of Bookings, Events, and Quotes', () => {
    it('aggregates bookings, events, and quotes on their respective IST dates', async () => {
      mockPrisma.booking.findMany.mockResolvedValueOnce([
        {
          id: 1,
          bookingNumber: 'RM-B1',
          date: new Date('2026-09-15T04:30:00.000Z'), // 10:00 AM IST on Sept 15
          type: 'DAY_TOURISM',
          status: BookingStatus.CONFIRMED,
          headCountAdult: 10,
          headCountChild: 2,
          user: { id: 1, name: 'Alice', email: 'alice@test.com', phone: '111' },
          package: { id: 1, name: 'Standard' },
          activities: [],
          payments: [],
        },
      ]);

      mockPrisma.event.findMany.mockResolvedValueOnce([
        {
          id: 50,
          title: 'Monsoon Music Festival',
          description: 'Live band on the riverbank',
          eventDate: new Date('2026-09-15T10:00:00.000Z'),
          startTime: '16:00',
          endTime: '22:00',
          location: 'Riverside Amphitheater',
          capacity: 300,
          price: 500,
          status: 'PUBLISHED',
        },
      ]);

      mockPrisma.weddingQuote.findMany.mockResolvedValueOnce([
        {
          id: 88,
          quoteNumber: 'WQ-2026-00088',
          eventDate: new Date('2026-09-15T00:00:00.000Z'),
          eventType: 'WEDDING',
          status: 'APPROVED',
          guestCount: 150,
          total: 250000,
          advanceRequired: 50000,
          venueRequirements: 'Lawn + Dining',
          notes: 'Special floral mandap',
          user: { id: 2, name: 'Bride & Groom', email: 'wedding@test.com', phone: '222' },
          bookingId: null,
          booking: null,
        },
      ]);

      const report = await capacityService.getCalendarReport('2026-09-15', '2026-09-16');

      expect(report.totalDays).toBe(2);
      const day15 = report.days['2026-09-15'];
      expect(day15.totalBookings).toBe(1);
      expect(day15.totalGuests).toBe(12);
      expect(day15.totalEvents).toBe(1);
      expect(day15.events[0].title).toBe('Monsoon Music Festival');
      expect(day15.totalQuotes).toBe(1);
      expect(day15.quotes[0].quoteNumber).toBe('WQ-2026-00088');

      // Sept 16 should be empty of bookings/events/quotes
      const day16 = report.days['2026-09-16'];
      expect(day16.totalBookings).toBe(0);
      expect(day16.totalEvents).toBe(0);
      expect(day16.totalQuotes).toBe(0);
    });
  });

  describe('4. Capacity Calculations: Default vs Custom Override', () => {
    it('uses standard resource capacity (500) and calculates remaining capacity when no override exists', async () => {
      mockPrisma.booking.findMany.mockResolvedValueOnce([
        {
          id: 1,
          bookingNumber: 'RM-B1',
          date: new Date('2026-09-20T04:30:00.000Z'),
          type: 'DAY_TOURISM',
          status: BookingStatus.CONFIRMED,
          headCountAdult: 120,
          headCountChild: 30,
          user: { name: 'Bob' },
          package: { name: 'Day Standard' },
        },
      ]);

      const report = await capacityService.getCalendarReport('2026-09-20', '2026-09-20');
      const day = report.days['2026-09-20'];

      expect(day.hasOverride).toBe(false);
      expect(day.totalCapacity).toBe(500);
      expect(day.bookedCapacity).toBe(150); // 120 + 30
      expect(day.remainingCapacity).toBe(350); // 500 - 150
      expect(day.isSoldOut).toBe(false);
    });

    it('applies custom capacity override (e.g. 700 pax) with reason', async () => {
      mockPrisma.dailyCapacityOverride.findMany.mockResolvedValueOnce([
        {
          id: 10,
          date: new Date('2026-09-21T00:00:00.000Z'),
          customCapacity: 700,
          isClosed: false,
          reason: 'Extra festive marquee deployed',
        },
      ]);

      mockPrisma.booking.findMany.mockResolvedValueOnce([
        {
          id: 1,
          bookingNumber: 'RM-B1',
          date: new Date('2026-09-21T04:30:00.000Z'),
          type: 'DAY_TOURISM',
          status: BookingStatus.CONFIRMED,
          headCountAdult: 600,
          headCountChild: 0,
        },
      ]);

      const report = await capacityService.getCalendarReport('2026-09-21', '2026-09-21');
      const day = report.days['2026-09-21'];

      expect(day.hasOverride).toBe(true);
      expect(day.totalCapacity).toBe(700);
      expect(day.bookedCapacity).toBe(600);
      expect(day.remainingCapacity).toBe(100);
      expect(day.override.reason).toBe('Extra festive marquee deployed');
    });
  });

  describe('5. Blackout Dates & Closure Reasons', () => {
    it('flags blackout dates with zero remaining capacity and displays closure reason', async () => {
      mockPrisma.dailyCapacityOverride.findMany.mockResolvedValueOnce([
        {
          id: 12,
          date: new Date('2026-09-22T00:00:00.000Z'),
          customCapacity: null,
          isClosed: true,
          reason: 'Annual resort electrical maintenance & inspection',
        },
      ]);

      const report = await capacityService.getCalendarReport('2026-09-22', '2026-09-22');
      const day = report.days['2026-09-22'];

      expect(day.isClosed).toBe(true);
      expect(day.closureReason).toBe('Annual resort electrical maintenance & inspection');
      expect(day.remainingCapacity).toBe(0);
      expect(day.isSoldOut).toBe(true);
    });
  });

  describe('6. RBAC Role Protections', () => {
    it('CapacityController.getCalendar allows SUPER_ADMIN, BOOKING_MANAGER, and EVENT_MANAGER', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, capacityController.getCalendar);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.SUPER_ADMIN);
      expect(roles).toContain(Role.BOOKING_MANAGER);
      expect(roles).toContain(Role.EVENT_MANAGER);
      expect(roles).not.toContain(Role.USER);
    });

    it('AdminController.getCalendar allows SUPER_ADMIN, BOOKING_MANAGER, and EVENT_MANAGER', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, adminController.getCalendar);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.SUPER_ADMIN);
      expect(roles).toContain(Role.BOOKING_MANAGER);
      expect(roles).toContain(Role.EVENT_MANAGER);
      expect(roles).not.toContain(Role.USER);
    });

    it('CapacityController.setOverride retains strict mutation restriction (only SUPER_ADMIN & BOOKING_MANAGER)', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, capacityController.setOverride);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.SUPER_ADMIN);
      expect(roles).toContain(Role.BOOKING_MANAGER);
      expect(roles).not.toContain(Role.EVENT_MANAGER); // EVENT_MANAGER cannot mutate capacity overrides
    });
  });
});
