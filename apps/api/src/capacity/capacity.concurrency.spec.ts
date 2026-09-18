import { Test, TestingModule } from '@nestjs/testing';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/rivermist?schema=public';
}
import { CapacityService } from './capacity.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QuotesService } from '../quotes/quotes.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConflictException } from '@nestjs/common';
import { BookingStatus, QuoteStatus } from '@prisma/client';
import { normalizeToIstDateRange } from '../common/utils/date.util';

describe('Capacity Concurrency & Date-Scoped Locking (Phase 18D)', () => {
  jest.setTimeout(45000);

  let capacityService: CapacityService;
  let quotesService: QuotesService;
  let prisma: PrismaService;
  let testingModule: TestingModule;

  const TEST_DATES = [
    '2099-08-01',
    '2099-08-02',
    '2099-08-03',
    '2099-08-04',
    '2099-08-05',
    '2099-08-06',
    '2099-08-07',
    '2099-08-08',
  ];

  async function cleanupTestData() {
    for (const dateStr of TEST_DATES) {
      const { startOfDay, endOfDay } = normalizeToIstDateRange(dateStr);
      // Delete wedding quotes first or detach bookings
      await prisma.weddingQuote.deleteMany({
        where: {
          eventDate: { gte: startOfDay, lt: endOfDay },
        },
      });

      const testBookings = await prisma.booking.findMany({
        where: {
          date: { gte: startOfDay, lt: endOfDay },
        },
        select: { id: true },
      });

      const bookingIds = testBookings.map((b) => b.id);
      if (bookingIds.length > 0) {
        await prisma.weddingQuote.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await prisma.bookingResource.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await prisma.booking.deleteMany({
          where: { id: { in: bookingIds } },
        });
      }

      // Delete daily overrides
      await prisma.dailyCapacityOverride.deleteMany({
        where: {
          date: { gte: startOfDay, lt: endOfDay },
        },
      });
    }
  }

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        CapacityService,
        QuotesService,
        PrismaService,
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendQuoteCreated: jest.fn().mockResolvedValue(undefined),
            sendQuoteStatusUpdated: jest.fn().mockResolvedValue(undefined),
            sendWhatsAppNotification: jest.fn().mockResolvedValue(undefined),
            sendEmailNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    capacityService = testingModule.get<CapacityService>(CapacityService);
    quotesService = testingModule.get<QuotesService>(QuotesService);
    prisma = testingModule.get<PrismaService>(PrismaService);

    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await testingModule.close();
  });

  async function createBookingInTx(
    dateStr: string,
    quantity: number,
    resourceId: number,
    identifier: string,
    delayMs = 0
  ) {
    const { startOfDay } = normalizeToIstDateRange(dateStr);
    return prisma.$transaction(async (tx) => {
      // 1. Acquire date-scoped lock & validate capacity
      await capacityService.validateAndLockCapacity(tx, dateStr, [{ resourceId, quantity }]);

      // Artificial delay if needed to simulate work inside transaction
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      // 2. Persist booking and booking resource atomically
      return tx.booking.create({
        data: {
          bookingNumber: `RM-TEST-${identifier}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: startOfDay,
          type: 'DAY_TOURISM' as any,
          status: BookingStatus.CONFIRMED,
          userId: 1,
          packageId: 1,
          headCountAdult: quantity,
          resources: {
            create: [{ resourceId, quantity }],
          },
        },
      });
    });
  }

  describe('1. Simultaneous bookings on the same date', () => {
    it('serializes concurrent transactions safely on date-scoped lock and increments capacity accurately', async () => {
      const targetDate = '2099-08-01';
      const resource = await prisma.resource.findFirst({ where: { name: 'General Day Tourism' } });
      expect(resource).toBeDefined();

      // Launch two simultaneous booking transactions on the SAME date
      const [b1, b2] = await Promise.all([
        createBookingInTx(targetDate, 20, resource!.id, 'SAME-1', 40),
        createBookingInTx(targetDate, 30, resource!.id, 'SAME-2', 40),
      ]);

      expect(b1).toBeDefined();
      expect(b2).toBeDefined();

      // Check availability report: 20 + 30 = 50 booked
      const report = await capacityService.getAvailabilityReport(targetDate);
      const dayTourism = report.resources.find((r) => r.resourceId === resource!.id);
      expect(dayTourism).toBeDefined();
      expect(dayTourism!.bookedCapacity).toBe(50);
      expect(dayTourism!.remainingCapacity).toBe(dayTourism!.totalCapacity - 50);
    });
  });

  describe('2. Bookings on different dates', () => {
    it('executes concurrent transactions on different dates without cross-date lock contention', async () => {
      const dateA = '2099-08-02';
      const dateB = '2099-08-03';
      const resource = await prisma.resource.findFirst({ where: { name: 'General Day Tourism' } });
      expect(resource).toBeDefined();

      const startTime = Date.now();

      // Both transactions run concurrently with simulated processing delay
      const [resA, resB] = await Promise.all([
        createBookingInTx(dateA, 15, resource!.id, 'DIFF-A', 80),
        createBookingInTx(dateB, 25, resource!.id, 'DIFF-B', 80),
      ]);

      const elapsed = Date.now() - startTime;

      expect(resA).toBeDefined();
      expect(resB).toBeDefined();
      // Since locks are date-scoped, neither transaction waits on the other
      expect(elapsed).toBeLessThan(400);

      // Verify date-scoped capacity reports are completely independent
      const reportA = await capacityService.getAvailabilityReport(dateA);
      const reportB = await capacityService.getAvailabilityReport(dateB);

      const dayA = reportA.resources.find((r) => r.resourceId === resource!.id);
      const dayB = reportB.resources.find((r) => r.resourceId === resource!.id);

      expect(dayA!.bookedCapacity).toBe(15);
      expect(dayB!.bookedCapacity).toBe(25);
    });
  });

  describe('3. Insufficient capacity under concurrency', () => {
    it('prevents overbooking when concurrent requests exceed remaining capacity', async () => {
      const targetDate = '2099-08-04';
      const { startOfDay } = normalizeToIstDateRange(targetDate);

      // Setup a DailyCapacityOverride with a strict limit of 15 guests
      await prisma.dailyCapacityOverride.create({
        data: {
          date: startOfDay,
          customCapacity: 15,
          isClosed: false,
          reason: 'Concurrency test limit',
        },
      });

      const resource = await prisma.resource.findFirst({ where: { name: 'General Day Tourism' } });
      expect(resource).toBeDefined();

      // Two simultaneous requests for 10 guests each (10 + 10 = 20 > 15 capacity)
      const results = await Promise.allSettled([
        createBookingInTx(targetDate, 10, resource!.id, 'OVR-1', 40),
        createBookingInTx(targetDate, 10, resource!.id, 'OVR-2', 40),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Rejected transaction must throw ConflictException
      const failureReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(failureReason).toBeInstanceOf(ConflictException);
      expect(failureReason.message).toContain('unavailable');

      // Total booked in database must be strictly 10, NEVER 20
      const report = await capacityService.getAvailabilityReport(targetDate);
      const dayTourism = report.resources.find((r) => r.resourceId === resource!.id);
      expect(dayTourism!.totalCapacity).toBe(15);
      expect(dayTourism!.bookedCapacity).toBe(10);
      expect(dayTourism!.remainingCapacity).toBe(5);
    });
  });

  describe('4. Blackout / Override under concurrency', () => {
    it('rejects all concurrent bookings when date is marked as blackout / closed', async () => {
      const targetDate = '2099-08-05';
      const { startOfDay } = normalizeToIstDateRange(targetDate);

      await prisma.dailyCapacityOverride.create({
        data: {
          date: startOfDay,
          isClosed: true,
          reason: 'Private VIP Concurrency Event',
        },
      });

      const resource = await prisma.resource.findFirst({ where: { name: 'General Day Tourism' } });
      expect(resource).toBeDefined();

      // Launch multiple concurrent bookings for the blackout date
      const results = await Promise.allSettled([
        createBookingInTx(targetDate, 5, resource!.id, 'BLK-1'),
        createBookingInTx(targetDate, 8, resource!.id, 'BLK-2'),
      ]);

      expect(results.every((r) => r.status === 'rejected')).toBe(true);
      for (const r of results) {
        const error = (r as PromiseRejectedResult).reason;
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toContain('River Mist is closed on 2099-08-05: Private VIP Concurrency Event');
      }
    });

    it('enforces custom capacity override limit under concurrent load', async () => {
      const targetDate = '2099-08-06';
      const { startOfDay } = normalizeToIstDateRange(targetDate);

      await prisma.dailyCapacityOverride.create({
        data: {
          date: startOfDay,
          customCapacity: 25,
          isClosed: false,
          reason: 'Festival limited capacity',
        },
      });

      const resource = await prisma.resource.findFirst({ where: { name: 'General Day Tourism' } });
      expect(resource).toBeDefined();

      // Request 15 + 15 = 30 > 25 limit
      const results = await Promise.allSettled([
        createBookingInTx(targetDate, 15, resource!.id, 'LIM-1', 30),
        createBookingInTx(targetDate, 15, resource!.id, 'LIM-2', 30),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const report = await capacityService.getAvailabilityReport(targetDate);
      const dayTourism = report.resources.find((r) => r.resourceId === resource!.id);
      expect(dayTourism!.bookedCapacity).toBe(15);
      expect(dayTourism!.remainingCapacity).toBe(10);
    });
  });

  describe('5. Quote conversion under concurrency', () => {
    it('safely validates and locks capacity when converting quotes concurrently on the same date', async () => {
      const targetDate = '2099-08-07';

      // Create two wedding quotes requiring 120 guests each.
      // Wedding quotes require Main Dining (capacity: 200).
      // 120 + 120 = 240 > 200, so exactly ONE can convert.
      const quote1 = await quotesService.createQuote({
        name: 'Quote Test 1',
        email: 'quote1@test.com',
        phone: '9876543210',
        eventDate: targetDate,
        guestCount: 120,
        eventType: 'WEDDING',
      });

      const quote2 = await quotesService.createQuote({
        name: 'Quote Test 2',
        email: 'quote2@test.com',
        phone: '9876543211',
        eventDate: targetDate,
        guestCount: 120,
        eventType: 'WEDDING',
      });

      // Approve both quotes so they are eligible for conversion
      await prisma.weddingQuote.update({
        where: { id: quote1.id },
        data: { status: QuoteStatus.APPROVED },
      });
      await prisma.weddingQuote.update({
        where: { id: quote2.id },
        data: { status: QuoteStatus.APPROVED },
      });

      // Attempt concurrent conversion of both quotes
      const results = await Promise.allSettled([
        quotesService.convertQuoteToBooking(quote1.id, 1),
        quotesService.convertQuoteToBooking(quote2.id, 1),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one must succeed, and exactly one must fail due to capacity constraint
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const rej = rejected[0] as PromiseRejectedResult;
      expect(rej.reason).toBeInstanceOf(ConflictException);

      const q1 = await prisma.weddingQuote.findUnique({ where: { id: quote1.id } });
      const q2 = await prisma.weddingQuote.findUnique({ where: { id: quote2.id } });

      const convertedCount = [q1?.status, q2?.status].filter((s) => s === QuoteStatus.CONVERTED).length;
      const approvedCount = [q1?.status, q2?.status].filter((s) => s === QuoteStatus.APPROVED).length;

      expect(convertedCount).toBe(1);
      expect(approvedCount).toBe(1);
    });
  });

  describe('6. Transaction rollback on capacity failure', () => {
    it('completely rolls back uncommitted changes when capacity validation fails', async () => {
      const targetDate = '2099-08-08';
      const { startOfDay } = normalizeToIstDateRange(targetDate);
      const resource = await prisma.resource.findFirst({ where: { name: 'General Day Tourism' } });
      expect(resource).toBeDefined();

      const candidateBookingNumber = `RM-ROLLBACK-${Date.now()}`;

      // Simulate a transaction that attempts to book more than total capacity
      await expect(
        prisma.$transaction(async (tx) => {
          // Attempting to book 10000 guests (far exceeds capacity)
          await capacityService.validateAndLockCapacity(tx, targetDate, [
            { resourceId: resource!.id, quantity: 10000 },
          ]);

          // Should never reach here
          await tx.booking.create({
            data: {
              bookingNumber: candidateBookingNumber,
              date: startOfDay,
              type: 'DAY_TOURISM' as any,
              status: BookingStatus.CONFIRMED,
              userId: 1,
              packageId: 1,
              headCountAdult: 10000,
            },
          });
        })
      ).rejects.toThrow(ConflictException);

      // Verify no phantom booking exists in database
      const found = await prisma.booking.findUnique({
        where: { bookingNumber: candidateBookingNumber },
      });
      expect(found).toBeNull();

      // Verify that subsequent valid booking transaction succeeds immediately (locks were released)
      const validBooking = await createBookingInTx(targetDate, 10, resource!.id, 'POST-ROLLBACK');
      expect(validBooking).toBeDefined();

      const report = await capacityService.getAvailabilityReport(targetDate);
      const dayTourism = report.resources.find((r) => r.resourceId === resource!.id);
      expect(dayTourism!.bookedCapacity).toBe(10);
    });
  });
});
