import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, Prisma } from '@prisma/client';

export const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.REQUESTED,
  BookingStatus.UNDER_REVIEW,
  BookingStatus.APPROVED,
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.CONFIRMED,
];

@Injectable()
export class CapacityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get availability report for a specific date
   */
  async getAvailabilityReport(dateString: string) {
    const date = new Date(dateString);
    date.setUTCHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const resources = await this.prisma.resource.findMany({
      where: { active: true },
    });

    const report = [];

    for (const resource of resources) {
      // Find all active bookings using this resource on the given date
      const consumed = await this.prisma.bookingResource.aggregate({
        where: {
          resourceId: resource.id,
          booking: {
            date: {
              gte: date,
              lt: nextDate,
            },
            status: {
              in: ACTIVE_BOOKING_STATUSES,
            },
          },
        },
        _sum: {
          // @ts-ignore - Prisma client may need regeneration
          quantity: true,
        },
      });

      const bookedCapacity = (consumed._sum as any)?.quantity || 0;
      const remainingCapacity = resource.capacity - bookedCapacity;

      // Count of bookings for this resource on this date
      const bookingCount = await this.prisma.bookingResource.count({
        where: {
          resourceId: resource.id,
          booking: {
            date: {
              gte: date,
              lt: nextDate,
            },
            status: {
              in: ACTIVE_BOOKING_STATUSES,
            },
          },
        },
      });

      report.push({
        resourceId: resource.id,
        resourceName: resource.name,
        type: resource.type,
        totalCapacity: resource.capacity,
        bookedCapacity,
        remainingCapacity,
        bookingCount,
        isAvailable: remainingCapacity > 0,
      });
    }

    return {
      date: dateString,
      resources: report,
    };
  }

  /**
   * Internal method to check and lock capacity during a transaction
   * @param tx Prisma transaction client
   */
  async validateAndLockCapacity(
    tx: Prisma.TransactionClient,
    date: Date,
    resourceRequirements: { resourceId: number; quantity: number }[]
  ) {
    const checkDate = new Date(date);
    checkDate.setUTCHours(0, 0, 0, 0);
    const nextDate = new Date(checkDate);
    nextDate.setDate(nextDate.getDate() + 1);

    for (const req of resourceRequirements) {
      // Lock the resource row to prevent concurrent modifications
      const resource = (await tx.$queryRaw`
        SELECT * FROM "Resource" WHERE id = ${req.resourceId} FOR UPDATE
      `) as any[];

      if (!resource || resource.length === 0) {
        throw new ConflictException(`Resource with ID ${req.resourceId} not found or inactive`);
      }

      const capacity = resource[0].capacity;

      // Sum existing capacity consumed
      const consumed = await tx.bookingResource.aggregate({
        where: {
          resourceId: req.resourceId,
          booking: {
            date: {
              gte: checkDate,
              lt: nextDate,
            },
            status: {
              in: ACTIVE_BOOKING_STATUSES,
            },
          },
        },
        _sum: {
          // @ts-ignore - Prisma client may need regeneration
          quantity: true,
        },
      });

      const bookedCapacity = (consumed._sum as any)?.quantity || 0;
      
      if (bookedCapacity + req.quantity > capacity) {
        throw new ConflictException(
          `Sorry, the selected date is currently unavailable for ${resource[0].name}. (Available: ${capacity - bookedCapacity}, Requested: ${req.quantity})`
        );
      }
    }

    return true;
  }
}
