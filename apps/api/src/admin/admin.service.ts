import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, BookingStatus, QuoteStatus, Role } from '@prisma/client';

export interface DashboardSummaryResponse {
  timestamp: string;
  attentionRequired: {
    pendingBookingsCount: number;
    paymentPendingCount: number;
    outstandingBalanceCount: number;
    pendingQuotesCount: number;
    totalActionItems: number;
  };
  today: {
    dateStr: string;
    bookingsCount: number;
    confirmedBookingsCount: number;
    totalGuests: number;
    revenueReceived: number;
    eventsCount: number;
  };
  revenue: {
    moneyReceived: {
      today: number;
      thisWeek: number;
      thisMonth: number;
      allTime: number;
    };
    bookingValue: {
      confirmedValue: number;
      totalActiveValue: number;
    };
    outstandingBalance: number;
    paymentPendingAmount: number;
  };
  bookingStatuses: {
    requested: number;
    approved: number;
    paymentPending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  };
  pendingActions: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    count: number;
    urgency: 'HIGH' | 'MEDIUM' | 'INFO';
    link: string;
    buttonLabel: string;
  }>;
  upcomingBookings: Array<{
    id: number;
    bookingNumber: string;
    packageName: string;
    date: string;
    headCountAdult: number;
    headCountChild: number;
    status: BookingStatus;
    totalAmount: number;
    amountPaid: number;
    balanceAmount: number;
    customerName: string;
  }>;
  weddingEnquiries: Array<{
    id: number;
    quoteNumber: string;
    eventDate: string;
    guestCount: number;
    total: number;
    status: QuoteStatus;
    eventType: string;
    createdAt: string;
    contactName: string;
    contactPhone?: string;
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    entityType: string;
    description: string;
    actorName: string;
    actorRole?: string;
    createdAt: string;
  }>;
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Comprehensive operational aggregation for River Mist Operations Control Center
   */
  async getDashboardSummary(userRole?: Role, referenceDate: Date = new Date()): Promise<DashboardSummaryResponse> {
    const now = referenceDate;
    // India Standard Time (IST, UTC+05:30) offset
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istEpochMs = now.getTime() + istOffsetMs;
    const istDateObj = new Date(istEpochMs);

    const istYear = istDateObj.getUTCFullYear();
    const istMonth = istDateObj.getUTCMonth();
    const istDate = istDateObj.getUTCDate();
    const istDayOfWeek = istDateObj.getUTCDay(); // 0 is Sunday, 1 is Monday...

    // Start & End of today in IST (converted to UTC Date for Postgres comparison)
    const startOfToday = new Date(Date.UTC(istYear, istMonth, istDate) - istOffsetMs);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    // Start & End of this week in IST (Monday 00:00:00 to next Monday 00:00:00)
    const daysSinceMonday = (istDayOfWeek + 6) % 7;
    const startOfWeek = new Date(startOfToday.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Start & End of this month in IST (1st of current month 00:00:00 to 1st of next month 00:00:00)
    const startOfMonth = new Date(Date.UTC(istYear, istMonth, 1) - istOffsetMs);
    const endOfMonth = new Date(Date.UTC(istYear, istMonth + 1, 1) - istOffsetMs);

    const activeStatuses: BookingStatus[] = [
      BookingStatus.REQUESTED,
      BookingStatus.UNDER_REVIEW,
      BookingStatus.APPROVED,
      BookingStatus.PAYMENT_PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
    ];

    // Execute server-side aggregations in parallel
    const [
      pendingBookingsCount,
      paymentPendingCount,
      outstandingBalanceCount,
      pendingQuotesCount,
      todayBookings,
      todayRevenueAgg,
      todayEventsCount,
      weekRevenueAgg,
      monthRevenueAgg,
      allTimeRevenueAgg,
      confirmedBookingsAgg,
      activeBookingsAgg,
      statusCountsRaw,
      upcomingBookingsRaw,
      weddingQuotesRaw,
      recentLogsRaw,
    ] = await Promise.all([
      // 1. Pending Bookings Count (REQUESTED or UNDER_REVIEW)
      this.prisma.booking.count({
        where: { status: { in: [BookingStatus.REQUESTED, BookingStatus.UNDER_REVIEW] } },
      }),

      // 2. Payment Pending Count (APPROVED or PAYMENT_PENDING)
      this.prisma.booking.count({
        where: { status: { in: [BookingStatus.APPROVED, BookingStatus.PAYMENT_PENDING] } },
      }),

      // 3. Partial payments with balance due (active bookings with advance paid but balance remaining)
      this.prisma.booking.count({
        where: {
          status: { in: [BookingStatus.APPROVED, BookingStatus.PAYMENT_PENDING, BookingStatus.CONFIRMED] },
          amountPaid: { gt: 0 },
          balanceAmount: { gt: 0 },
        },
      }),

      // 4. Pending Wedding Quotes (DRAFT or SENT)
      this.prisma.weddingQuote.count({
        where: { status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] } },
      }),

      // 5. Today's bookings
      this.prisma.booking.findMany({
        where: {
          date: { gte: startOfToday, lt: endOfToday },
          status: { in: activeStatuses },
        },
        select: {
          id: true,
          status: true,
          headCountAdult: true,
          headCountChild: true,
        },
      }),

      // 6. Today's captured revenue
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.CAPTURED,
          paymentDate: { gte: startOfToday, lt: endOfToday },
        },
        _sum: { amount: true },
      }),

      // 7. Today's events
      this.prisma.event.count({
        where: {
          active: true,
          eventDate: { gte: startOfToday, lt: endOfToday },
        },
      }),

      // 8. This week's captured revenue
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.CAPTURED,
          paymentDate: { gte: startOfWeek, lt: endOfWeek },
        },
        _sum: { amount: true },
      }),

      // 9. This month's captured revenue
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.CAPTURED,
          paymentDate: { gte: startOfMonth, lt: endOfMonth },
        },
        _sum: { amount: true },
      }),

      // 10. All-time captured revenue
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.CAPTURED },
        _sum: { amount: true },
      }),

      // 11. Confirmed booking values
      this.prisma.booking.aggregate({
        where: { status: BookingStatus.CONFIRMED },
        _sum: { totalAmount: true },
      }),

      // 12. Active booking values & outstanding balances
      this.prisma.booking.aggregate({
        where: { status: { in: activeStatuses } },
        _sum: {
          totalAmount: true,
          balanceAmount: true,
        },
      }),

      // 13. Status breakdown counts
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // 14. Upcoming Bookings (next 8 chronological)
      this.prisma.booking.findMany({
        where: {
          date: { gte: startOfToday },
          status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
        },
        orderBy: { date: 'asc' },
        take: 8,
        select: {
          id: true,
          bookingNumber: true,
          date: true,
          status: true,
          headCountAdult: true,
          headCountChild: true,
          totalAmount: true,
          amountPaid: true,
          balanceAmount: true,
          package: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),

      // 15. Recent Wedding Quotes (top 5 active)
      this.prisma.weddingQuote.findMany({
        where: { status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVED] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          quoteNumber: true,
          eventDate: true,
          guestCount: true,
          total: true,
          status: true,
          eventType: true,
          createdAt: true,
          user: { select: { name: true, phone: true } },
        },
      }),

      // 16. Recent Audit Activity (top 8, redacted)
      userRole === Role.SUPER_ADMIN
        ? this.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
              id: true,
              action: true,
              entity: true,
              description: true,
              createdAt: true,
              user: {
                select: {
                  name: true,
                  role: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    // Calculate today's metrics
    const todayGuests = todayBookings.reduce((sum, b) => sum + (b.headCountAdult || 0) + (b.headCountChild || 0), 0);
    const todayConfirmedCount = todayBookings.filter(b => b.status === BookingStatus.CONFIRMED).length;

    // Calculate payment pending amounts
    const paymentPendingBookings = await this.prisma.booking.aggregate({
      where: { status: { in: [BookingStatus.APPROVED, BookingStatus.PAYMENT_PENDING] } },
      _sum: { balanceAmount: true },
    });

    // Map status breakdown from groupBy results
    const statusMap = new Map<BookingStatus, number>();
    statusCountsRaw.forEach(item => {
      statusMap.set(item.status, item._count.status);
    });

    const bookingStatuses = {
      requested: (statusMap.get(BookingStatus.REQUESTED) || 0) + (statusMap.get(BookingStatus.UNDER_REVIEW) || 0),
      approved: statusMap.get(BookingStatus.APPROVED) || 0,
      paymentPending: statusMap.get(BookingStatus.PAYMENT_PENDING) || 0,
      confirmed: statusMap.get(BookingStatus.CONFIRMED) || 0,
      cancelled: (statusMap.get(BookingStatus.CANCELLED) || 0) + (statusMap.get(BookingStatus.REJECTED) || 0),
      completed: statusMap.get(BookingStatus.COMPLETED) || 0,
    };

    // Actionable pending items
    const pendingActions: DashboardSummaryResponse['pendingActions'] = [];

    if (pendingBookingsCount > 0) {
      pendingActions.push({
        id: 'action-pending-bookings',
        type: 'BOOKING_REQUEST',
        title: `${pendingBookingsCount} booking request${pendingBookingsCount > 1 ? 's' : ''} awaiting review`,
        description: 'Verify date & capacity availability before approving payment instructions.',
        count: pendingBookingsCount,
        urgency: 'HIGH',
        link: '/admin/bookings?status=REQUESTED',
        buttonLabel: 'Review Bookings',
      });
    }

    if (paymentPendingCount > 0) {
      pendingActions.push({
        id: 'action-payment-pending',
        type: 'PAYMENT_PENDING',
        title: `${paymentPendingCount} booking${paymentPendingCount > 1 ? 's' : ''} awaiting payment`,
        description: 'Payment instructions dispatched. Check UPI/Bank records to record payment.',
        count: paymentPendingCount,
        urgency: 'HIGH',
        link: '/admin/bookings?status=PAYMENT_PENDING',
        buttonLabel: 'Review Payments',
      });
    }

    if (pendingQuotesCount > 0) {
      pendingActions.push({
        id: 'action-pending-quotes',
        type: 'WEDDING_QUOTE',
        title: `${pendingQuotesCount} wedding/event quote${pendingQuotesCount > 1 ? 's' : ''} need follow-up`,
        description: 'Enquiries submitted via quote builder. Review and send custom proposal.',
        count: pendingQuotesCount,
        urgency: 'MEDIUM',
        link: '/admin/quotes',
        buttonLabel: 'View Quotes',
      });
    }

    if (outstandingBalanceCount > 0) {
      pendingActions.push({
        id: 'action-partial-payments',
        type: 'PARTIAL_PAYMENT',
        title: `${outstandingBalanceCount} partial payment${outstandingBalanceCount > 1 ? 's' : ''} with balance due`,
        description: 'Advance received; collect remaining balance upon arrival or check-in.',
        count: outstandingBalanceCount,
        urgency: 'INFO',
        link: '/admin/bookings?status=CONFIRMED',
        buttonLabel: 'View Bookings',
      });
    }

    // Format formatted date string in Indian calendar locale
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    };
    const dateStr = now.toLocaleDateString('en-IN', dateOptions);

    return {
      timestamp: now.toISOString(),
      attentionRequired: {
        pendingBookingsCount,
        paymentPendingCount,
        outstandingBalanceCount,
        pendingQuotesCount,
        totalActionItems: pendingBookingsCount + paymentPendingCount + pendingQuotesCount + outstandingBalanceCount,
      },
      today: {
        dateStr,
        bookingsCount: todayBookings.length,
        confirmedBookingsCount: todayConfirmedCount,
        totalGuests: todayGuests,
        revenueReceived: todayRevenueAgg._sum.amount || 0,
        eventsCount: todayEventsCount,
      },
      revenue: {
        moneyReceived: {
          today: todayRevenueAgg._sum.amount || 0,
          thisWeek: weekRevenueAgg._sum.amount || 0,
          thisMonth: monthRevenueAgg._sum.amount || 0,
          allTime: allTimeRevenueAgg._sum.amount || 0,
        },
        bookingValue: {
          confirmedValue: confirmedBookingsAgg._sum.totalAmount || 0,
          totalActiveValue: activeBookingsAgg._sum.totalAmount || 0,
        },
        outstandingBalance: activeBookingsAgg._sum.balanceAmount || 0,
        paymentPendingAmount: paymentPendingBookings._sum.balanceAmount || 0,
      },
      bookingStatuses,
      pendingActions,
      upcomingBookings: (upcomingBookingsRaw || []).map(b => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        packageName: b.package?.name || 'Experience Package',
        date: b.date ? (typeof b.date === 'string' ? b.date : b.date.toISOString()) : new Date().toISOString(),
        headCountAdult: b.headCountAdult,
        headCountChild: b.headCountChild,
        status: b.status,
        totalAmount: b.totalAmount,
        amountPaid: b.amountPaid,
        balanceAmount: b.balanceAmount,
        customerName: b.user?.name || 'Guest',
      })),
      weddingEnquiries: (weddingQuotesRaw || []).map(q => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        eventDate: q.eventDate ? (typeof q.eventDate === 'string' ? q.eventDate : q.eventDate.toISOString()) : new Date().toISOString(),
        guestCount: q.guestCount,
        total: q.total,
        status: q.status,
        eventType: q.eventType,
        createdAt: q.createdAt ? (typeof q.createdAt === 'string' ? q.createdAt : q.createdAt.toISOString()) : new Date().toISOString(),
        contactName: q.user?.name || 'Prospective Host',
        contactPhone: q.user?.phone || undefined,
      })),
      recentActivity: (recentLogsRaw || []).map(l => ({
        id: l.id,
        action: l.action,
        entityType: l.entity || 'SYSTEM',
        description: l.description || `${l.action} on ${l.entity || 'record'}`,
        actorName: l.user?.name || 'System',
        actorRole: l.user?.role || undefined,
        createdAt: l.createdAt ? (typeof l.createdAt === 'string' ? l.createdAt : l.createdAt.toISOString()) : new Date().toISOString(),
      })),
    };
  }

  /**
   * Legacy dashboard statistics (preserved for backwards compatibility)
   */
  async getDashboardStats() {
    const totalBookings = await this.prisma.booking.count({
      where: {
        status: {
          in: [
            BookingStatus.APPROVED,
            BookingStatus.CONFIRMED,
            BookingStatus.COMPLETED,
            BookingStatus.UNDER_REVIEW,
            BookingStatus.PAYMENT_PENDING,
          ],
        },
      },
    });

    const payments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.CAPTURED },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    const upcomingBookings = await this.prisma.booking.count({
      where: {
        status: BookingStatus.CONFIRMED,
        date: { gte: new Date() },
      },
    });

    const openQuotes = await this.prisma.weddingQuote.count({
      where: {
        status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVED] },
      },
    });

    return {
      totalBookings,
      totalRevenue,
      upcomingBookings,
      openQuotes,
    };
  }

  async getRevenue() {
    const payments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.CAPTURED },
      include: {
        booking: {
          select: { bookingNumber: true, user: { select: { name: true } } },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
    return payments;
  }
}
