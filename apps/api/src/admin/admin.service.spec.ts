import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PaymentStatus, QuoteStatus, Role } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  const mockPrismaService = {
    booking: {
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    weddingQuote: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    event: {
      count: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get(PrismaService);
  });

  describe('getDashboardSummary', () => {
    it('should aggregate metrics and strictly separate Money Received from Booking Value', async () => {
      // 1. Pending Bookings Count
      prisma.booking.count
        .mockResolvedValueOnce(4) // pendingBookingsCount
        .mockResolvedValueOnce(3) // paymentPendingCount
        .mockResolvedValueOnce(2); // partialPaymentsCount (balance > 0, amountPaid > 0)

      // 4. Pending Quotes Count
      prisma.weddingQuote.count.mockResolvedValueOnce(5);

      // 5. Today's Bookings
      prisma.booking.findMany
        .mockResolvedValueOnce([
          { id: 1, status: BookingStatus.CONFIRMED, headCountAdult: 2, headCountChild: 1 },
          { id: 2, status: BookingStatus.REQUESTED, headCountAdult: 4, headCountChild: 0 },
        ]) // todayBookings
        .mockResolvedValueOnce([
          {
            id: 10,
            bookingNumber: 'RM-2026-000010',
            date: new Date('2026-09-15T10:00:00.000Z'),
            status: BookingStatus.CONFIRMED,
            headCountAdult: 2,
            headCountChild: 0,
            totalAmount: 3000,
            amountPaid: 1500,
            balanceAmount: 1500,
            package: { name: 'Deluxe Agro Day Visit' },
            user: { name: 'Rohan Deshmukh' },
          },
        ]); // upcomingBookingsRaw

      // Payments Aggregations (Today, Week, Month, All-Time)
      prisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 4500 } }) // today
        .mockResolvedValueOnce({ _sum: { amount: 18000 } }) // week
        .mockResolvedValueOnce({ _sum: { amount: 75000 } }) // month
        .mockResolvedValueOnce({ _sum: { amount: 350000 } }); // all-time

      // Today's events
      prisma.event.count.mockResolvedValueOnce(1);

      // Booking Values (Confirmed value, Active value)
      prisma.booking.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 120000 } }) // confirmedValue
        .mockResolvedValueOnce({ _sum: { totalAmount: 200000, balanceAmount: 45000 } }) // active bookings & balance
        .mockResolvedValueOnce({ _sum: { balanceAmount: 15000 } }); // paymentPendingBookings

      // Status Breakdown groupBy
      prisma.booking.groupBy.mockResolvedValueOnce([
        { status: BookingStatus.REQUESTED, _count: { status: 4 } },
        { status: BookingStatus.APPROVED, _count: { status: 1 } },
        { status: BookingStatus.PAYMENT_PENDING, _count: { status: 2 } },
        { status: BookingStatus.CONFIRMED, _count: { status: 15 } },
        { status: BookingStatus.CANCELLED, _count: { status: 3 } },
      ]);

      // Wedding Quotes Raw
      prisma.weddingQuote.findMany.mockResolvedValueOnce([
        {
          id: 50,
          quoteNumber: 'WQ-2026-000050',
          eventDate: new Date('2026-11-20T00:00:00.000Z'),
          guestCount: 250,
          total: 350000,
          status: QuoteStatus.SENT,
          eventType: 'WEDDING',
          createdAt: new Date('2026-09-01T12:00:00.000Z'),
          user: { name: 'Pooja Kadam', phone: '9822334455' },
        },
      ]);

      // Recent Audit Logs (SUPER_ADMIN)
      prisma.auditLog.findMany.mockResolvedValueOnce([
        {
          id: 101,
          action: 'STATUS_CHANGE',
          entity: 'BOOKING',
          description: 'Booking #10 status changed to CONFIRMED',
          user: { name: 'Admin User', role: 'SUPER_ADMIN' },
          createdAt: new Date('2026-09-08T15:30:00.000Z'),
        },
      ]);

      const result = await service.getDashboardSummary(Role.SUPER_ADMIN);

      // Verify structure
      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Attention Required
      expect(result.attentionRequired.pendingBookingsCount).toBe(4);
      expect(result.attentionRequired.paymentPendingCount).toBe(3);
      expect(result.attentionRequired.outstandingBalanceCount).toBe(2);
      expect(result.attentionRequired.pendingQuotesCount).toBe(5);
      expect(result.attentionRequired.totalActionItems).toBe(14);

      // Today's Operations
      expect(result.today.bookingsCount).toBe(2);
      expect(result.today.confirmedBookingsCount).toBe(1);
      expect(result.today.totalGuests).toBe(7); // (2+1) + (4+0)
      expect(result.today.revenueReceived).toBe(4500);
      expect(result.today.eventsCount).toBe(1);

      // Financial Truth Verification: Money Received != Booking Value
      expect(result.revenue.moneyReceived.today).toBe(4500);
      expect(result.revenue.moneyReceived.thisWeek).toBe(18000);
      expect(result.revenue.moneyReceived.thisMonth).toBe(75000);
      expect(result.revenue.moneyReceived.allTime).toBe(350000);

      expect(result.revenue.bookingValue.confirmedValue).toBe(120000);
      expect(result.revenue.bookingValue.totalActiveValue).toBe(200000);
      expect(result.revenue.outstandingBalance).toBe(45000);
      expect(result.revenue.paymentPendingAmount).toBe(15000);

      // Assert Money Received is strictly not confused with Booking Value
      expect(result.revenue.moneyReceived.allTime).not.toEqual(result.revenue.bookingValue.totalActiveValue);

      // Status breakdown
      expect(result.bookingStatuses.requested).toBe(4);
      expect(result.bookingStatuses.approved).toBe(1);
      expect(result.bookingStatuses.paymentPending).toBe(2);
      expect(result.bookingStatuses.confirmed).toBe(15);
      expect(result.bookingStatuses.cancelled).toBe(3);

      // Pending actions
      expect(result.pendingActions.length).toBe(4);
      expect(result.pendingActions[0].type).toBe('BOOKING_REQUEST');
      expect(result.pendingActions[0].link).toBe('/admin/bookings?status=REQUESTED');

      // Upcoming bookings
      expect(result.upcomingBookings.length).toBe(1);
      expect(result.upcomingBookings[0].bookingNumber).toBe('RM-2026-000010');
      expect(result.upcomingBookings[0].customerName).toBe('Rohan Deshmukh');

      // Wedding enquiries
      expect(result.weddingEnquiries.length).toBe(1);
      expect(result.weddingEnquiries[0].quoteNumber).toBe('WQ-2026-000050');
      expect(result.weddingEnquiries[0].contactName).toBe('Pooja Kadam');

      // Recent Activity
      expect(result.recentActivity.length).toBe(1);
      expect(result.recentActivity[0].action).toBe('STATUS_CHANGE');
    });

    it('should return empty audit activity when user is not SUPER_ADMIN', async () => {
      // Setup basic mocks returning zero/empty data
      prisma.booking.count.mockResolvedValue(0);
      prisma.weddingQuote.count.mockResolvedValue(0);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.event.count.mockResolvedValue(0);
      prisma.booking.aggregate.mockResolvedValue({ _sum: { totalAmount: 0, balanceAmount: 0 } });
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.weddingQuote.findMany.mockResolvedValue([]);

      const result = await service.getDashboardSummary(Role.BOOKING_MANAGER);

      expect(result.recentActivity).toEqual([]);
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    });

    it('should handle completely empty database state without errors', async () => {
      prisma.booking.count.mockResolvedValue(0);
      prisma.weddingQuote.count.mockResolvedValue(0);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.event.count.mockResolvedValue(0);
      prisma.booking.aggregate.mockResolvedValue({ _sum: { totalAmount: null, balanceAmount: null } });
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.weddingQuote.findMany.mockResolvedValue([]);

      const result = await service.getDashboardSummary(Role.SUPER_ADMIN);

      expect(result.attentionRequired.totalActionItems).toBe(0);
      expect(result.today.bookingsCount).toBe(0);
      expect(result.today.totalGuests).toBe(0);
      expect(result.today.revenueReceived).toBe(0);
      expect(result.revenue.moneyReceived.today).toBe(0);
      expect(result.revenue.bookingValue.confirmedValue).toBe(0);
      expect(result.pendingActions).toEqual([]);
      expect(result.upcomingBookings).toEqual([]);
      expect(result.weddingEnquiries).toEqual([]);
    });
  });

  describe('Legacy methods (backwards compatibility)', () => {
    it('getDashboardStats should return legacy counts', async () => {
      prisma.booking.count.mockResolvedValueOnce(25).mockResolvedValueOnce(10);
      prisma.payment.findMany.mockResolvedValueOnce([
        { id: 1, amount: 1500, status: PaymentStatus.CAPTURED },
        { id: 2, amount: 3500, status: PaymentStatus.CAPTURED },
      ]);
      prisma.weddingQuote.count.mockResolvedValueOnce(3);

      const stats = await service.getDashboardStats();
      expect(stats.totalBookings).toBe(25);
      expect(stats.totalRevenue).toBe(5000);
      expect(stats.upcomingBookings).toBe(10);
      expect(stats.openQuotes).toBe(3);
    });

    it('getRevenue should return payments with booking & user', async () => {
      const mockPayments = [
        { id: 1, amount: 2000, booking: { bookingNumber: 'RM-01', user: { name: 'Alice' } } },
      ];
      prisma.payment.findMany.mockResolvedValueOnce(mockPayments);

      const res = await service.getRevenue();
      expect(res).toEqual(mockPayments);
    });
  });

  describe('IST Date Boundaries & Financial Aggregation Verification', () => {
    function setupDefaultMocks() {
      prisma.booking.count.mockResolvedValue(0);
      prisma.weddingQuote.count.mockResolvedValue(0);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      prisma.event.count.mockResolvedValue(0);
      prisma.booking.aggregate.mockResolvedValue({ _sum: { totalAmount: 0, balanceAmount: 0 } });
      prisma.booking.groupBy.mockResolvedValue([]);
      prisma.weddingQuote.findMany.mockResolvedValue([]);
      prisma.auditLog.findMany.mockResolvedValue([]);
    }

    it('1 & 2. IST midnight boundary: 00:01 IST on 2026-09-09 maps to 2026-09-08T18:30:00.000Z startOfToday', async () => {
      setupDefaultMocks();
      // 00:01:00 IST on 2026-09-09 = 2026-09-08T18:31:00.000Z
      const refDate = new Date('2026-09-08T18:31:00.000Z');

      await service.getDashboardSummary(Role.SUPER_ADMIN, refDate);

      // Today's bookings boundary check
      expect(prisma.booking.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-09-08T18:30:00.000Z'), // 00:00:00 IST on 2026-09-09
              lt: new Date('2026-09-09T18:30:00.000Z'),  // 00:00:00 IST on 2026-09-10
            },
          }),
        }),
      );

      // Today's captured revenue boundary check
      expect(prisma.payment.aggregate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            status: PaymentStatus.CAPTURED,
            paymentDate: {
              gte: new Date('2026-09-08T18:30:00.000Z'),
              lt: new Date('2026-09-09T18:30:00.000Z'),
            },
          }),
        }),
      );
    });

    it('1 & 2. IST late evening boundary: 23:59:59 IST on 2026-09-09 maps to same Indian day', async () => {
      setupDefaultMocks();
      // 23:59:59 IST on 2026-09-09 = 2026-09-09T18:29:59.000Z
      const refDate = new Date('2026-09-09T18:29:59.000Z');

      const result = await service.getDashboardSummary(Role.SUPER_ADMIN, refDate);

      expect(prisma.booking.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-09-08T18:30:00.000Z'),
              lt: new Date('2026-09-09T18:30:00.000Z'),
            },
          }),
        }),
      );

      // Verify date string formatted in Asia/Kolkata
      expect(result.today.dateStr).toContain('9');
    });

    it('3 & 4. Monday-Sunday week boundaries: Wednesday mid-week correctly bounds Monday 00:00 IST to Sunday 23:59:59 IST', async () => {
      setupDefaultMocks();
      // Wednesday 2026-09-09 11:30:00 IST = 2026-09-09T06:00:00.000Z
      const refDate = new Date('2026-09-09T06:00:00.000Z');

      await service.getDashboardSummary(Role.SUPER_ADMIN, refDate);

      // Call 2 of payment.aggregate is this week's revenue
      expect(prisma.payment.aggregate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            status: PaymentStatus.CAPTURED,
            paymentDate: {
              gte: new Date('2026-09-06T18:30:00.000Z'), // Monday 2026-09-07 00:00:00 IST
              lt: new Date('2026-09-13T18:30:00.000Z'),  // Next Monday 2026-09-14 00:00:00 IST
            },
          }),
        }),
      );
    });

    it('4. Sunday late night boundary: 23:59:59 IST Sunday remains within current week', async () => {
      setupDefaultMocks();
      // Sunday 2026-09-13 23:59:59 IST = 2026-09-13T18:29:59.000Z
      const refDate = new Date('2026-09-13T18:29:59.000Z');

      await service.getDashboardSummary(Role.SUPER_ADMIN, refDate);

      expect(prisma.payment.aggregate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            paymentDate: {
              gte: new Date('2026-09-06T18:30:00.000Z'), // Monday 2026-09-07 00:00:00 IST
              lt: new Date('2026-09-13T18:30:00.000Z'),  // Next Monday 2026-09-14 00:00:00 IST
            },
          }),
        }),
      );
    });

    it('5. Calendar month boundary & year-end rollover: Dec 31 23:59:59 IST bounds month Dec 1 to Jan 1', async () => {
      setupDefaultMocks();
      // Dec 31, 2026 23:59:59 IST = 2026-12-31T18:29:59.000Z
      const refDate = new Date('2026-12-31T18:29:59.000Z');

      await service.getDashboardSummary(Role.SUPER_ADMIN, refDate);

      // Call 3 of payment.aggregate is this month's revenue
      expect(prisma.payment.aggregate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: expect.objectContaining({
            status: PaymentStatus.CAPTURED,
            paymentDate: {
              gte: new Date('2026-11-30T18:30:00.000Z'), // Dec 1, 2026 00:00:00 IST
              lt: new Date('2026-12-31T18:30:00.000Z'),  // Jan 1, 2027 00:00:00 IST
            },
          }),
        }),
      );
    });

    it('6, 7 & 8. Financial separation: totalAmount ₹10,000, paid ₹3,000, balance ₹7,000 does NOT report ₹10,000 revenue received', async () => {
      setupDefaultMocks();
      const refDate = new Date('2026-09-09T06:00:00.000Z');

      // Mock CAPTURED payment of ₹3,000 today
      prisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 3000 } }) // today revenue
        .mockResolvedValueOnce({ _sum: { amount: 3000 } }) // week revenue
        .mockResolvedValueOnce({ _sum: { amount: 3000 } }) // month revenue
        .mockResolvedValueOnce({ _sum: { amount: 3000 } }); // all-time revenue

      // Mock Booking active value = ₹10,000, balance = ₹7,000
      prisma.booking.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 10000 } }) // confirmedValue
        .mockResolvedValueOnce({ _sum: { totalAmount: 10000, balanceAmount: 7000 } }) // active total & balance
        .mockResolvedValueOnce({ _sum: { balanceAmount: 7000 } }); // paymentPendingBookings

      const result = await service.getDashboardSummary(Role.SUPER_ADMIN, refDate);

      // Money Received is strictly ₹3,000 from CAPTURED payments
      expect(result.today.revenueReceived).toBe(3000);
      expect(result.revenue.moneyReceived.today).toBe(3000);
      expect(result.revenue.moneyReceived.allTime).toBe(3000);

      // Booking Value is strictly ₹10,000
      expect(result.revenue.bookingValue.totalActiveValue).toBe(10000);
      expect(result.revenue.bookingValue.confirmedValue).toBe(10000);

      // Outstanding Balance is strictly ₹7,000
      expect(result.revenue.outstandingBalance).toBe(7000);

      // Strict financial inequality: Money Received != Booking Value
      expect(result.revenue.moneyReceived.today).not.toEqual(result.revenue.bookingValue.totalActiveValue);
      expect(result.revenue.moneyReceived.allTime).not.toEqual(result.revenue.bookingValue.totalActiveValue);
    });

    it('9 & 10. Upcoming bookings: includes bookings starting from today 00:00:00 IST', async () => {
      setupDefaultMocks();
      const refDate = new Date('2026-09-09T06:00:00.000Z');

      await service.getDashboardSummary(Role.SUPER_ADMIN, refDate);

      // Call 2 of booking.findMany is upcoming bookings
      expect(prisma.booking.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: new Date('2026-09-08T18:30:00.000Z') }, // Today 00:00:00 IST
            status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
          }),
          orderBy: { date: 'asc' },
          take: 8,
        }),
      );
    });
  });
});
