import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, BookingStatus, QuoteStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const totalBookings = await this.prisma.booking.count({
      where: {
        status: { in: [BookingStatus.APPROVED, BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.UNDER_REVIEW, BookingStatus.PAYMENT_PENDING] }
      }
    });

    const payments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.CAPTURED }
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    const upcomingBookings = await this.prisma.booking.count({
      where: {
        status: BookingStatus.CONFIRMED,
        date: { gte: new Date() }
      }
    });

    const openQuotes = await this.prisma.weddingQuote.count({
      where: {
        status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVED] }
      }
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
          select: { bookingNumber: true, user: { select: { name: true } } }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });
    return payments;
  }
}
