import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BookingStatus, Prisma } from '@prisma/client';
import { normalizeToIstDateRange } from '../common/utils/date.util';
import { SetDailyCapacityOverrideDto } from './dto/set-daily-capacity-override.dto';

export const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.REQUESTED,
  BookingStatus.UNDER_REVIEW,
  BookingStatus.APPROVED,
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.CONFIRMED,
];

@Injectable()
export class CapacityService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get all daily overrides or filter by date range
   */
  async getDailyOverrides(startDate?: string, endDate?: string) {
    let whereClause: any = {};
    if (startDate && endDate) {
      const startRange = normalizeToIstDateRange(startDate);
      const endRange = normalizeToIstDateRange(endDate);
      whereClause.date = {
        gte: startRange.startOfDay,
        lt: endRange.endOfDay,
      };
    } else if (startDate) {
      const startRange = normalizeToIstDateRange(startDate);
      whereClause.date = {
        gte: startRange.startOfDay,
      };
    } else if (endDate) {
      const endRange = normalizeToIstDateRange(endDate);
      whereClause.date = {
        lt: endRange.endOfDay,
      };
    }

    return this.prisma.dailyCapacityOverride.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Set or update a daily capacity override / blackout date
   */
  async setDailyOverride(dto: SetDailyCapacityOverrideDto, actorUserId?: number) {
    if (dto.customCapacity === undefined && dto.isClosed === undefined && dto.reason === undefined) {
      throw new BadRequestException('At least one of customCapacity, isClosed, or reason must be provided');
    }

    if (dto.customCapacity !== undefined && dto.customCapacity !== null && dto.customCapacity < 0) {
      throw new BadRequestException('Capacity must be a non-negative number');
    }

    const { startOfDay, endOfDay, dateStr } = normalizeToIstDateRange(dto.date);

    // Look for existing override on this IST calendar day
    const existing = await this.prisma.dailyCapacityOverride.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (existing) {
      const updateData: any = {};
      if (dto.customCapacity !== undefined) updateData.customCapacity = dto.customCapacity;
      if (dto.isClosed !== undefined) updateData.isClosed = dto.isClosed;
      if (dto.reason !== undefined) updateData.reason = dto.reason;

      const updated = await this.prisma.dailyCapacityOverride.update({
        where: { id: existing.id },
        data: updateData,
      });

      await this.auditService.logAction({
        action: 'UPDATE',
        entity: 'DAILY_CAPACITY_OVERRIDE',
        entityId: updated.id,
        entityKey: dateStr,
        userId: actorUserId,
        description: `Updated daily capacity override for ${dateStr} (closed: ${updated.isClosed}, capacity: ${updated.customCapacity})`,
        oldValue: {
          customCapacity: existing.customCapacity,
          isClosed: existing.isClosed,
          reason: existing.reason,
        },
        newValue: {
          customCapacity: updated.customCapacity,
          isClosed: updated.isClosed,
          reason: updated.reason,
        },
      });

      return updated;
    }

    const created = await this.prisma.dailyCapacityOverride.create({
      data: {
        date: startOfDay,
        customCapacity: dto.customCapacity ?? null,
        isClosed: dto.isClosed ?? false,
        reason: dto.reason ?? null,
      },
    });

    await this.auditService.logAction({
      action: 'CREATE',
      entity: 'DAILY_CAPACITY_OVERRIDE',
      entityId: created.id,
      entityKey: dateStr,
      userId: actorUserId,
      description: `Created daily capacity override for ${dateStr} (closed: ${created.isClosed}, capacity: ${created.customCapacity})`,
      newValue: {
        customCapacity: created.customCapacity,
        isClosed: created.isClosed,
        reason: created.reason,
      },
    });

    return created;
  }

  /**
   * Delete a daily capacity override by ID
   */
  async deleteDailyOverride(id: number, actorUserId?: number) {
    const existing = await this.prisma.dailyCapacityOverride.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Daily capacity override #${id} not found`);
    }

    const { dateStr } = normalizeToIstDateRange(existing.date);

    await this.prisma.dailyCapacityOverride.delete({
      where: { id },
    });

    await this.auditService.logAction({
      action: 'DELETE',
      entity: 'DAILY_CAPACITY_OVERRIDE',
      entityId: id,
      entityKey: dateStr,
      userId: actorUserId,
      description: `Deleted daily capacity override for ${dateStr}`,
      oldValue: {
        date: existing.date,
        customCapacity: existing.customCapacity,
        isClosed: existing.isClosed,
        reason: existing.reason,
      },
    });

    return { success: true, id };
  }

  /**
   * Get availability report for a specific date in Indian Standard Time (IST)
   */
  async getAvailabilityReport(dateString: string) {
    const { startOfDay, endOfDay, dateStr } = normalizeToIstDateRange(dateString);

    // 1. Fetch any daily capacity override / blackout for this date
    const override = await this.prisma.dailyCapacityOverride.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const isClosed = override?.isClosed ?? false;
    const closureReason = isClosed
      ? override?.reason || 'Resort closed for a private booking or maintenance'
      : null;

    const resources = await this.prisma.resource.findMany({
      where: { active: true },
    });

    const report = [];

    for (const resource of resources) {
      // Find all active bookings using this resource on the given date (within IST day boundaries)
      const consumed = await this.prisma.bookingResource.aggregate({
        where: {
          resourceId: resource.id,
          booking: {
            date: {
              gte: startOfDay,
              lt: endOfDay,
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

      // Determine effective capacity: override takes precedence over normal resource capacity
      let effectiveCapacity = resource.capacity;
      let hasOverride = false;

      if (
        !isClosed &&
        (resource.name === 'General Day Tourism' || resource.type === 'CAPACITY') &&
        override?.customCapacity !== null &&
        override?.customCapacity !== undefined
      ) {
        effectiveCapacity = override.customCapacity;
        hasOverride = true;
      }

      const remainingCapacity = isClosed ? 0 : Math.max(0, effectiveCapacity - bookedCapacity);

      // Count of bookings for this resource on this date
      const bookingCount = await this.prisma.bookingResource.count({
        where: {
          resourceId: resource.id,
          booking: {
            date: {
              gte: startOfDay,
              lt: endOfDay,
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
        totalCapacity: effectiveCapacity,
        originalCapacity: resource.capacity,
        bookedCapacity,
        remainingCapacity,
        bookingCount,
        isAvailable: !isClosed && remainingCapacity > 0,
        hasOverride,
      });
    }

    return {
      date: dateStr,
      isClosed,
      closureReason,
      hasOverride: Boolean(override),
      override: override
        ? {
            id: override.id,
            customCapacity: override.customCapacity,
            isClosed: override.isClosed,
            reason: override.reason,
          }
        : null,
      resources: report,
    };
  }

  /**
   * Internal method to check and lock capacity during a transaction using IST boundaries.
   * Enforces blackout dates and daily capacity overrides with precedence over static defaults.
   * @param tx Prisma transaction client
   * @param date Target visit date (Date object or string)
   * @param resourceRequirements Resource IDs and quantities required
   */
  async validateAndLockCapacity(
    tx: Prisma.TransactionClient,
    date: Date | string,
    resourceRequirements: { resourceId: number; quantity: number }[]
  ) {
    const { startOfDay, endOfDay, dateStr } = normalizeToIstDateRange(date);

    // 1. Check for blackout date / daily capacity override within this transaction
    const override = await tx.dailyCapacityOverride.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (override?.isClosed) {
      const reasonMsg = override.reason ? `: ${override.reason}` : ' for a private event or maintenance';
      throw new ConflictException(`Sorry, River Mist is closed on ${dateStr}${reasonMsg}.`);
    }

    for (const req of resourceRequirements) {
      // Lock the resource row to prevent concurrent modifications
      const resource = (await tx.$queryRaw`
        SELECT * FROM "Resource" WHERE id = ${req.resourceId} FOR UPDATE
      `) as any[];

      if (!resource || resource.length === 0) {
        throw new ConflictException(`Resource with ID ${req.resourceId} not found or inactive`);
      }

      // Determine effective capacity: override takes precedence over normal capacity
      let capacity = resource[0].capacity;
      if (
        (resource[0].name === 'General Day Tourism' || resource[0].type === 'CAPACITY') &&
        override?.customCapacity !== null &&
        override?.customCapacity !== undefined
      ) {
        capacity = override.customCapacity;
      }

      // Sum existing capacity consumed within the authoritative IST day window
      const consumed = await tx.bookingResource.aggregate({
        where: {
          resourceId: req.resourceId,
          booking: {
            date: {
              gte: startOfDay,
              lt: endOfDay,
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
        if (capacity === 0) {
          throw new ConflictException(`Sorry, ${resource[0].name} is fully booked / closed on ${dateStr}.`);
        }
        const available = Math.max(0, capacity - bookedCapacity);
        throw new ConflictException(
          `Sorry, the selected date is currently unavailable for ${resource[0].name}. (Available: ${available}, Requested: ${req.quantity})`
        );
      }
    }

    return true;
  }
}

