import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BookingStatus, Prisma } from '@prisma/client';
import { normalizeToIstDateRange, ONE_DAY_MS } from '../common/utils/date.util';
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
      if (startRange.startOfDay > endRange.endOfDay) {
        throw new BadRequestException('startDate cannot be after endDate');
      }
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

    if (dto.customCapacity !== undefined && dto.customCapacity !== null) {
      if (typeof dto.customCapacity !== 'number' || isNaN(dto.customCapacity) || !Number.isInteger(dto.customCapacity) || dto.customCapacity < 0) {
        throw new BadRequestException('Capacity must be a non-negative integer');
      }
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
    if (!id || isNaN(id) || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('Invalid override ID');
    }

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
   * Get calendar and capacity control center report for a date range in IST.
   * Aggregates active bookings, scheduled events, quotes, capacity, and overrides.
   * @param startDate YYYY-MM-DD
   * @param endDate YYYY-MM-DD
   */
  async getCalendarReport(startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required (YYYY-MM-DD)');
    }

    const startRange = normalizeToIstDateRange(startDate);
    const endRange = normalizeToIstDateRange(endDate);

    if (startRange.startOfDay > endRange.endOfDay) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    const diffDays = Math.round(
      (endRange.endOfDay.getTime() - startRange.startOfDay.getTime()) / ONE_DAY_MS
    );
    if (diffDays > 62) {
      throw new BadRequestException('Date range cannot exceed 62 days');
    }

    // 1. Fetch overrides in range
    const overrides = await this.prisma.dailyCapacityOverride.findMany({
      where: {
        date: {
          gte: startRange.startOfDay,
          lt: endRange.endOfDay,
        },
      },
      orderBy: { date: 'asc' },
    });

    const overrideMap = new Map<string, any>();
    for (const ov of overrides) {
      const { dateStr } = normalizeToIstDateRange(ov.date);
      overrideMap.set(dateStr, ov);
    }

    // 2. Fetch active bookings in range
    const bookings = await this.prisma.booking.findMany({
      where: {
        date: {
          gte: startRange.startOfDay,
          lt: endRange.endOfDay,
        },
        status: {
          in: ACTIVE_BOOKING_STATUSES,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        package: { select: { id: true, name: true, slug: true } },
        activities: { include: { activity: true } },
        payments: { select: { id: true, amount: true, status: true, method: true } },
      },
      orderBy: { date: 'asc' },
    });

    const bookingsByDate = new Map<string, any[]>();
    for (const b of bookings) {
      const { dateStr } = normalizeToIstDateRange(b.date);
      if (!bookingsByDate.has(dateStr)) {
        bookingsByDate.set(dateStr, []);
      }
      bookingsByDate.get(dateStr)!.push(b);
    }

    // 3. Fetch scheduled events in range
    const events = await this.prisma.event.findMany({
      where: {
        eventDate: {
          gte: startRange.startOfDay,
          lt: endRange.endOfDay,
        },
        active: true,
      },
      orderBy: { eventDate: 'asc' },
    });

    const eventsByDate = new Map<string, any[]>();
    for (const ev of events) {
      const { dateStr } = normalizeToIstDateRange(ev.eventDate);
      if (!eventsByDate.has(dateStr)) {
        eventsByDate.set(dateStr, []);
      }
      eventsByDate.get(dateStr)!.push(ev);
    }

    // 4. Fetch quotes in range
    const quotes = await this.prisma.weddingQuote.findMany({
      where: {
        eventDate: {
          gte: startRange.startOfDay,
          lt: endRange.endOfDay,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        booking: { select: { id: true, bookingNumber: true, status: true } },
      },
      orderBy: { eventDate: 'asc' },
    });

    const quotesByDate = new Map<string, any[]>();
    for (const q of quotes) {
      const { dateStr } = normalizeToIstDateRange(q.eventDate);
      if (!quotesByDate.has(dateStr)) {
        quotesByDate.set(dateStr, []);
      }
      quotesByDate.get(dateStr)!.push(q);
    }

    // 5. Default General Tourism Capacity (Prioritize type CAPACITY or fallback to name General Day Tourism)
    const generalResource = await this.prisma.resource.findFirst({
      where: {
        active: true,
        OR: [
          { type: 'CAPACITY' },
          { name: { equals: 'General Day Tourism', mode: 'insensitive' } },
        ],
      },
      orderBy: { id: 'asc' },
    });
    const defaultCapacity = generalResource?.capacity ?? 500;

    // 6. Aggregate day by day across the requested IST interval
    const daysMap: Record<string, any> = {};
    const daysList: any[] = [];

    let currentRange = startRange;
    while (currentRange.startOfDay < endRange.endOfDay) {
      const dStr = currentRange.dateStr;
      const override = overrideMap.get(dStr);
      const isClosed = override?.isClosed ?? false;
      const closureReason = isClosed
        ? override?.reason || 'Resort closed for a private event or maintenance'
        : null;

      let effectiveCapacity = defaultCapacity;
      let hasOverride = false;

      if (!isClosed && override?.customCapacity !== null && override?.customCapacity !== undefined) {
        effectiveCapacity = override.customCapacity;
        hasOverride = true;
      }

      const dayBookings = bookingsByDate.get(dStr) || [];
      const dayEvents = eventsByDate.get(dStr) || [];
      const dayQuotes = quotesByDate.get(dStr) || [];

      const bookedCapacity = dayBookings.reduce(
        (sum, b) => sum + (b.headCountAdult || 0) + (b.headCountChild || 0),
        0
      );

      const remainingCapacity = isClosed ? 0 : Math.max(0, effectiveCapacity - bookedCapacity);
      const isSoldOut = isClosed || remainingCapacity <= 0;

      const daySummary = {
        date: dStr,
        isClosed,
        closureReason,
        hasOverride,
        override: override
          ? {
              id: override.id,
              customCapacity: override.customCapacity,
              isClosed: override.isClosed,
              reason: override.reason,
            }
          : null,
        totalCapacity: effectiveCapacity,
        defaultCapacity,
        bookedCapacity,
        remainingCapacity,
        isSoldOut,
        totalBookings: dayBookings.length,
        totalGuests: bookedCapacity,
        totalEvents: dayEvents.length,
        totalQuotes: dayQuotes.length,
        bookings: dayBookings.map((b) => ({
          id: b.id,
          bookingNumber: b.bookingNumber,
          date: dStr,
          type: b.type,
          status: b.status,
          headCountAdult: b.headCountAdult,
          headCountChild: b.headCountChild,
          totalGuests: (b.headCountAdult || 0) + (b.headCountChild || 0),
          subtotalAmount: b.subtotalAmount,
          totalAmount: b.totalAmount,
          advanceRequired: b.advanceRequired,
          amountPaid: b.amountPaid,
          balanceAmount: b.balanceAmount,
          notes: b.notes,
          user: b.user,
          package: b.package,
          activities: b.activities?.map((a: any) => ({
            id: a.activityId,
            name: a.activity?.name,
            pricingType: a.activity?.pricingType,
          })),
          payments: b.payments,
        })),
        events: dayEvents.map((ev) => ({
          id: ev.id,
          title: ev.title,
          description: ev.description,
          eventDate: dStr,
          startTime: ev.startTime,
          endTime: ev.endTime,
          location: ev.location,
          capacity: ev.capacity,
          price: ev.price,
          status: ev.status,
        })),
        quotes: dayQuotes.map((q) => ({
          id: q.id,
          quoteNumber: q.quoteNumber,
          eventDate: dStr,
          eventType: q.eventType,
          status: q.status,
          guestCount: q.guestCount,
          total: q.total,
          advanceRequired: q.advanceRequired,
          venueRequirements: q.venueRequirements,
          notes: q.notes,
          user: q.user,
          bookingId: q.bookingId,
          bookingNumber: q.booking?.bookingNumber,
        })),
      };

      daysMap[dStr] = daySummary;
      daysList.push(daySummary);

      // Advance to next day in IST
      const nextStartMs = currentRange.startOfDay.getTime() + ONE_DAY_MS;
      currentRange = normalizeToIstDateRange(new Date(nextStartMs));
    }

    return {
      startDate: startRange.dateStr,
      endDate: endRange.dateStr,
      totalDays: daysList.length,
      totalBookings: bookings.length,
      totalGuests: daysList.reduce((sum, d) => sum + d.totalGuests, 0),
      totalEvents: events.length,
      totalQuotes: quotes.length,
      days: daysMap,
      daysList,
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

    // Deduplicate and aggregate requirements by resourceId
    const aggregatedReqMap = new Map<number, number>();
    for (const req of resourceRequirements) {
      aggregatedReqMap.set(
        req.resourceId,
        (aggregatedReqMap.get(req.resourceId) || 0) + req.quantity
      );
    }

    // Sort requirements by resourceId ascending to eliminate deadlock risk across concurrent transactions
    const sortedRequirements = Array.from(aggregatedReqMap.entries())
      .map(([resourceId, quantity]) => ({ resourceId, quantity }))
      .sort((a, b) => a.resourceId - b.resourceId);

    const dateAsInt = parseInt(dateStr.replace(/-/g, ''), 10);

    for (const req of sortedRequirements) {
      // Date-scoped transaction advisory lock: locks the specific (resourceId, dateAsInt) pair
      // for the duration of this transaction, removing the cross-date global table bottleneck.
      const resource = (await tx.$queryRaw`
        SELECT *, pg_advisory_xact_lock(id, ${dateAsInt})::text AS locked FROM "Resource" WHERE id = ${req.resourceId}
      `) as any[];

      if (!resource || resource.length === 0 || !resource[0].active) {
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

