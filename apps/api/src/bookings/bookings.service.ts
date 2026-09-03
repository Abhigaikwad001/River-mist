import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PaymentStatus, EventType } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto/create-booking.dto';
import { CapacityService } from '../capacity/capacity.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService, 
    private capacityService: CapacityService,
    private notificationsService: NotificationsService
  ) {}

  /**
   * Check Capacity for a given date, guest count, and event type
   */
  async checkCapacity(date: string, guests: number, type: any) {
    const report = await this.capacityService.getAvailabilityReport(date);
    const resourceName = (type === EventType.WEDDING || type === EventType.DESTINATION_WEDDING) ? 'Wedding Lawn' : 'General Day Tourism';
    
    const resource = report.resources.find(r => r.resourceName === resourceName);
    if (!resource) {
      return { available: false, message: 'Resource not configured' };
    }

    return {
      available: resource.remainingCapacity >= guests,
      remainingCapacity: resource.remainingCapacity
    };
  }

  /**
   * Pricing Engine & Booking Creation
   */
  async createBooking(data: CreateBookingDto, authUserId?: number) {
    const { date, type, packageId, headCountAdult, headCountChild, notes, activityIds } = data;
    const totalGuests = headCountAdult + headCountChild;

    // Use provided userId or fallback to a default guest user
    let userId = authUserId;
    if (!userId) {
      const guestUser = await this.prisma.user.findUnique({ where: { email: 'guest@example.com' } });
      if (!guestUser) {
        throw new BadRequestException('Guest user not found in database. Please seed.');
      }
      userId = guestUser.id;
    }

    // Identify resources required
    // 1. Primary Venue
    const resourceName = (type === EventType.WEDDING || type === EventType.DESTINATION_WEDDING) ? 'Wedding Lawn' : 'General Day Tourism';
    // 2. Dining Area (Assuming everyone needs dining)
    const diningResourceName = 'Main Dining';
    // 3. Parking (Assume 1 vehicle per 5 guests for simplicity, or configurable)
    const parkingResourceName = 'Parking';
    const estimatedVehicles = Math.ceil(totalGuests / 5);

    const requiredResources = await this.prisma.resource.findMany({
      where: { name: { in: [resourceName, diningResourceName, parkingResourceName] }, active: true }
    });

    const resourceRequirements = requiredResources.map(res => {
      let quantity = totalGuests; // Default for venue and dining
      if (res.name === parkingResourceName) {
        quantity = estimatedVehicles;
      }
      return { resourceId: res.id, quantity };
    });

    // 2. Load package early to check constraints
    const pkg = await this.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) throw new BadRequestException('Invalid package selected');

    if (totalGuests < pkg.minGuests) {
      throw new BadRequestException(`Minimum ${pkg.minGuests} guests required for this package`);
    }

    const targetDate = new Date(date);
    
    // Load activities
    let activityConnections: any[] = [];
    let activities: any[] = [];
    if (activityIds && activityIds.length > 0) {
      activities = await this.prisma.activity.findMany({
        where: { id: { in: activityIds } }
      });
      // Validate all requested activities exist
      if (activities.length !== activityIds.length) {
        throw new BadRequestException('One or more invalid activities selected');
      }
      for (const act of activities) {
        activityConnections.push({
          activity: { connect: { id: act.id } }
        });
      }
    }

    // Generate Booking Number OUTSIDE the transaction to reduce transaction duration
    // PostgreSQL count() can be slow and doesn't require transaction isolation here
    // since bookingNumber has a @unique constraint which protects against concurrent duplicates.
    const bookingCount = await this.prisma.booking.count();
    const bookingNumber = `RM-${new Date().getFullYear()}-${String(bookingCount + 1).padStart(6, '0')}`;

    // Execute in transaction for atomic capacity locking and pricing rules
    const booking = await this.prisma.$transaction(async (tx) => {
      // 1. Check & Lock Capacity
      await this.capacityService.validateAndLockCapacity(tx, targetDate, resourceRequirements);

      // 2. Server-Side Pricing Engine
      let subtotal = (pkg.priceAdult * headCountAdult) + (pkg.priceChild * headCountChild);

      for (const act of activities) {
        if (act.pricingType === 'PER_PERSON') {
          subtotal += act.price * totalGuests;
        } else if (act.pricingType === 'FIXED') {
          subtotal += act.price;
        }
      }

      let discountAmount = 0;
      if (data.discountCode) {
        // Find discount and lock row
        const discounts: any[] = await tx.$queryRaw`SELECT * FROM "Discount" WHERE code = ${data.discountCode} FOR UPDATE`;
        if (discounts.length === 0) throw new BadRequestException('Invalid discount code');
        const discount = discounts[0];

        if (!discount.active) throw new BadRequestException('Discount code is inactive');
        const now = new Date();
        if (discount.validFrom && new Date(discount.validFrom) > now) throw new BadRequestException('Discount code not yet valid');
        if (discount.validUntil && new Date(discount.validUntil) < now) throw new BadRequestException('Discount code expired');
        if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) throw new BadRequestException('Discount usage limit reached');

        if (discount.type === 'PERCENTAGE') {
          discountAmount = Math.floor(subtotal * (discount.value / 100));
        } else if (discount.type === 'FIXED') {
          discountAmount = discount.value;
        }

        discountAmount = Math.min(discountAmount, subtotal);
        
        await tx.discount.update({
          where: { id: discount.id },
          data: { usageCount: { increment: 1 } }
        });
      }

      const postDiscountSubtotal = subtotal - discountAmount;
      const taxRate = process.env.TAX_RATE ? parseFloat(process.env.TAX_RATE) : 0;
      const taxAmount = Math.floor(postDiscountSubtotal * taxRate);
      const totalAmount = postDiscountSubtotal + taxAmount;

      const advanceRequired = (type === EventType.WEDDING || type === EventType.DESTINATION_WEDDING) 
        ? Math.floor(totalAmount * 0.25) 
        : totalAmount; // 25% for wedding, 100% for day

      // Booking Number is generated outside the transaction to save time

      let resourceConnections = resourceRequirements.map(req => ({
        resource: { connect: { id: req.resourceId } },
        quantity: req.quantity
      }));

      // 3. State Machine & Creation
      const created = await tx.booking.create({
        data: {
          bookingNumber,
          date: targetDate,
          type,
          status: BookingStatus.REQUESTED, // All bookings start as requested to be reviewed by admin
          userId,
          packageId,
          headCountAdult,
          headCountChild,
          totalAmount,
          advanceRequired,
          balanceAmount: totalAmount,
          notes,
          activities: {
            create: activityConnections
          },
          resources: {
            create: resourceConnections
          }
        },
        include: {
          package: true,
          activities: { include: { activity: true } },
          resources: { include: { resource: true } }
        }
      });

      return created;
    }, { 
      maxWait: 5000, 
      timeout: 15000 
    });

    // Fire & forget notification
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      this.notificationsService.sendBookingRequested(
        booking.id,
        user.email,
        user.name,
        booking.bookingNumber
      ).catch((err: unknown) => console.error('Failed to dispatch notification:', err));
    }

    return booking;
  }

  async getMyBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { 
        package: true, 
        activities: { include: { activity: true } },
        payments: true
      },
      orderBy: { date: 'desc' }
    });
  }

  async getAllBookings() {
    return this.prisma.booking.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
        package: true,
        activities: { include: { activity: true } },
        payments: true
      },
      orderBy: { date: 'desc' }
    });
  }

  async updateBookingStatus(bookingId: number, newStatus: BookingStatus) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    const currentStatus = booking.status;
    
    // Define valid transitions
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      DRAFT: [BookingStatus.REQUESTED, BookingStatus.CANCELLED],
      REQUESTED: [BookingStatus.UNDER_REVIEW, BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
      UNDER_REVIEW: [BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
      APPROVED: [BookingStatus.PAYMENT_PENDING, BookingStatus.CANCELLED],
      PAYMENT_PENDING: [BookingStatus.CONFIRMED, BookingStatus.APPROVED, BookingStatus.CANCELLED],
      CONFIRMED: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
      REJECTED: [],
      CANCELLED: [],
      COMPLETED: [],
      REFUND_PENDING: [BookingStatus.REFUNDED],
      REFUNDED: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    if (newStatus === BookingStatus.CONFIRMED) {
      if (booking.amountPaid < booking.advanceRequired) {
        throw new BadRequestException('Cannot confirm booking: Advance payment requirement not met.');
      }
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: newStatus },
      include: { user: true }
    });

    // Fire & forget notification
    this.notificationsService.sendBookingStatusUpdated(
      updatedBooking.id,
      updatedBooking.user.email,
      updatedBooking.user.name,
      updatedBooking.bookingNumber,
      updatedBooking.status
    ).catch((err: unknown) => console.error('Failed to dispatch notification:', err));

    return updatedBooking;
  }

  async updateBookingNotes(bookingId: number, notes: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { notes }
    });
  }

  async getBookingById(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        package: true,
        activities: { include: { activity: true } },
        payments: true
      }
    });
    if (!booking) {
      throw new BadRequestException(`Booking ${id} not found`);
    }
    return booking;
  }
}
