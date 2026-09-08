import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BookingStatus, PaymentStatus, EventType } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto/create-booking.dto';
import { CapacityService } from '../capacity/capacity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpiPaymentQrService } from '../payments/qr/upi-payment-qr.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService, 
    private capacityService: CapacityService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
    private upiPaymentQrService: UpiPaymentQrService,
    private whatsAppService: WhatsAppService,
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
      let appliedDiscount: any = null;
      if (data.discountCode && data.discountCode.trim() !== '') {
        const normalizedCode = data.discountCode.trim().toUpperCase();
        // Find discount and lock row for update
        const discounts: any[] = await tx.$queryRaw`SELECT * FROM "Discount" WHERE UPPER(code) = ${normalizedCode} FOR UPDATE`;
        if (discounts.length === 0) throw new BadRequestException('Invalid discount code');
        const discount = discounts[0];

        if (!discount.active) throw new BadRequestException('Discount code is inactive');
        const now = new Date();
        if (discount.validFrom && new Date(discount.validFrom) > now) throw new BadRequestException('Discount code not yet active');
        if (discount.validUntil && new Date(discount.validUntil) < now) throw new BadRequestException('Discount code expired');
        if (discount.usageLimit !== null && discount.usageLimit !== undefined && discount.usageCount >= discount.usageLimit) {
          throw new BadRequestException('Discount usage limit reached');
        }

        // Per-customer usage limit check
        if (discount.perCustomerLimit && discount.perCustomerLimit > 0) {
          const userBookingCount = await tx.booking.count({
            where: { userId, discountId: discount.id }
          });
          if (userBookingCount >= discount.perCustomerLimit) {
            throw new BadRequestException(`Per-customer usage limit reached for offer '${discount.code}'`);
          }
        }

        // Minimum booking subtotal requirement check
        if (discount.minBookingAmount && discount.minBookingAmount > 0 && subtotal < discount.minBookingAmount) {
          throw new BadRequestException(
            `Minimum booking subtotal of ₹${discount.minBookingAmount.toLocaleString('en-IN')} required for offer '${discount.code}'`
          );
        }

        // Applicable packages check
        if (Array.isArray(discount.applicablePackages) && discount.applicablePackages.length > 0) {
          const pkgMatch = discount.applicablePackages.some(
            (p: string) => p === String(pkg.id) || p.toLowerCase() === pkg.slug.toLowerCase()
          );
          if (!pkgMatch) {
            throw new BadRequestException(`Offer '${discount.code}' is not applicable to package '${pkg.name}'`);
          }
        }

        // Applicable activities check
        if (activityIds && activityIds.length > 0 && Array.isArray(discount.applicableActivities) && discount.applicableActivities.length > 0) {
          const actMatch = activityIds.some((actId: number) => discount.applicableActivities.includes(String(actId)));
          if (!actMatch) {
            throw new BadRequestException(`Offer '${discount.code}' is not applicable to selected activities`);
          }
        }

        const discTypeUpper = String(discount.type).toUpperCase();
        if (discTypeUpper === 'PERCENTAGE') {
          discountAmount = Math.floor(subtotal * (discount.value / 100));
          if (discount.maxDiscountAmount && discount.maxDiscountAmount > 0) {
            discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
          }
        } else if (discTypeUpper === 'FIXED_AMOUNT' || discTypeUpper === 'FIXED') {
          discountAmount = discount.value;
        }

        discountAmount = Math.min(discountAmount, subtotal);
        appliedDiscount = discount;
        
        await tx.discount.update({
          where: { id: discount.id },
          data: { usageCount: { increment: 1 } }
        });
      }

      const postDiscountSubtotal = Math.max(0, subtotal - discountAmount);
      const taxRate = process.env.TAX_RATE ? parseFloat(process.env.TAX_RATE) : 0;
      const taxAmount = Math.floor(postDiscountSubtotal * taxRate);
      const totalAmount = postDiscountSubtotal + taxAmount;

      const advanceRequired = (type === EventType.WEDDING || type === EventType.DESTINATION_WEDDING) 
        ? Math.floor(totalAmount * 0.25) 
        : totalAmount; // 25% for wedding, 100% for day

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
          subtotalAmount: subtotal,
          discountCode: appliedDiscount ? appliedDiscount.code : null,
          discountType: appliedDiscount ? appliedDiscount.type : null,
          discountValue: appliedDiscount ? appliedDiscount.value : 0,
          discountAmount,
          discountId: appliedDiscount ? appliedDiscount.id : null,
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
          discount: true,
          activities: { include: { activity: true } },
          resources: { include: { resource: true } }
        }
      });

      return created;
    }, { 
      maxWait: 5000, 
      timeout: 15000 
    });

    await this.auditService.logAction({
      action: 'CREATE',
      entity: 'BOOKING',
      entityId: booking.id,
      entityKey: booking.bookingNumber,
      userId: authUserId,
      description: `Created booking #${booking.bookingNumber} (${booking.type}) for ${totalGuests} guests (Total: ₹${booking.totalAmount})`,
      newValue: {
        bookingNumber: booking.bookingNumber,
        type: booking.type,
        totalAmount: booking.totalAmount,
        status: booking.status,
      },
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

  async updateBookingStatus(bookingId: number, newStatus: BookingStatus, actorUserId?: number) {
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

    await this.auditService.logAction({
      action: 'STATUS_CHANGE',
      entity: 'BOOKING',
      entityId: bookingId,
      entityKey: booking.bookingNumber,
      userId: actorUserId,
      description: `Booking #${booking.bookingNumber} status changed: ${currentStatus} → ${newStatus}`,
      oldValue: { status: currentStatus },
      newValue: { status: newStatus },
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

  async updateBookingNotes(bookingId: number, notes: string, actorUserId?: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { notes }
    });

    await this.auditService.logAction({
      action: 'UPDATE',
      entity: 'BOOKING',
      entityId: bookingId,
      entityKey: booking.bookingNumber,
      userId: actorUserId,
      description: `Updated notes on booking #${booking.bookingNumber}`,
      oldValue: { notes: booking.notes },
      newValue: { notes: updated.notes },
    });

    return updated;
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

  /**
   * Retrieves or generates the authoritative payment QR details for a booking.
   */
  async getPaymentQr(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { package: true, user: true },
    });

    if (!booking) {
      throw new BadRequestException(`Booking #${bookingId} not found`);
    }

    return this.upiPaymentQrService.generatePaymentRequest(booking);
  }

  /**
   * Sends payment instructions and QR code via official WhatsApp (or wa.me fallback)
   * based purely on authoritative server-side calculations.
   */
  async sendPaymentRequest(bookingId: number, actorUserId?: number, force?: boolean) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { package: true, user: true },
    });

    if (!booking) {
      throw new BadRequestException(`Booking #${bookingId} not found`);
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED) {
      throw new BadRequestException(`Cannot request payment for a ${booking.status.toLowerCase()} booking.`);
    }

    // 1. Authoritative calculation & QR generation
    const paymentRequest = await this.upiPaymentQrService.generatePaymentRequest(booking);

    // 2. State transition: If APPROVED, advance to PAYMENT_PENDING
    let currentStatus = booking.status;
    if (currentStatus === BookingStatus.APPROVED) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.PAYMENT_PENDING },
      });
      currentStatus = BookingStatus.PAYMENT_PENDING;

      await this.auditService.logAction({
        action: 'STATUS_CHANGE',
        entity: 'BOOKING',
        entityId: booking.id,
        entityKey: booking.bookingNumber,
        userId: actorUserId,
        description: `Booking #${booking.bookingNumber} transitioned from APPROVED to PAYMENT_PENDING on payment request`,
        oldValue: { status: BookingStatus.APPROVED },
        newValue: { status: BookingStatus.PAYMENT_PENDING },
      });
    }

    // 3. Dispatch via WhatsApp
    const whatsappResult = await this.whatsAppService.sendPaymentRequestWithQr({
      booking,
      user: booking.user,
      amountRequested: paymentRequest.calculation.amountRequested,
      upiId: paymentRequest.upiId,
      payeeName: paymentRequest.payeeName,
      upiUri: paymentRequest.upiUri,
      qrBuffer: paymentRequest.qrBuffer,
      qrDataUrl: paymentRequest.qrDataUrl,
      actorUserId,
      force,
    });

    // 4. Audit payment request dispatch
    await this.auditService.logAction({
      action: 'PAYMENT_REQUEST_SENT',
      entity: 'BOOKING',
      entityId: booking.id,
      entityKey: booking.bookingNumber,
      userId: actorUserId,
      description: `Dispatched payment request of ₹${paymentRequest.calculation.amountRequested} for booking #${booking.bookingNumber} to ${booking.user?.phone || 'business desk'}`,
      newValue: {
        amountRequested: paymentRequest.calculation.amountRequested,
        upiId: paymentRequest.upiId,
        upiUri: paymentRequest.upiUri,
        duplicateSuppressed: whatsappResult.duplicateSuppressed || false,
        whatsappSuccess: whatsappResult.success,
      },
    });

    return {
      success: true,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      status: currentStatus,
      calculation: paymentRequest.calculation,
      upiId: paymentRequest.upiId,
      payeeName: paymentRequest.payeeName,
      upiUri: paymentRequest.upiUri,
      qrDataUrl: paymentRequest.qrDataUrl,
      whatsapp: whatsappResult,
    };
  }

  /**
   * Confirms booking availability (Step 1).
   * Transitions REQUESTED or UNDER_REVIEW to APPROVED.
   * Emits audit log and dispatches approval notification WITHOUT requesting payment.
   */
  async confirmAvailability(bookingId: number, actorUserId?: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { package: true, user: true },
    });

    if (!booking) {
      throw new BadRequestException(`Booking #${bookingId} not found`);
    }

    if (booking.status !== BookingStatus.REQUESTED && booking.status !== BookingStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Cannot confirm availability for booking #${booking.bookingNumber} with status ${booking.status}`);
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.APPROVED },
      include: { package: true, user: true },
    });

    await this.auditService.logAction({
      action: 'CONFIRM_AVAILABILITY',
      entity: 'BOOKING',
      entityId: booking.id,
      entityKey: booking.bookingNumber,
      userId: actorUserId,
      description: `Availability confirmed for booking #${booking.bookingNumber} (${booking.status} → APPROVED)`,
      oldValue: { status: booking.status },
      newValue: { status: BookingStatus.APPROVED },
    });

    // Notify customer about approval (fire & forget)
    if (updatedBooking.user?.email) {
      this.notificationsService.sendBookingStatusUpdated(
        updatedBooking.id,
        updatedBooking.user.email,
        updatedBooking.user.name,
        updatedBooking.bookingNumber,
        BookingStatus.APPROVED
      ).catch((err: unknown) => console.error('Failed to dispatch status notification:', err));
    }

    return updatedBooking;
  }

  /**
   * Confirms availability and sends the exact-amount payment QR in a single staff action.
   */
  async confirmAvailabilityAndRequestPayment(bookingId: number, actorUserId?: number, force?: boolean) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { package: true, user: true },
    });

    if (!booking) {
      throw new BadRequestException(`Booking #${bookingId} not found`);
    }

    // 1. Confirm Availability if currently REQUESTED or UNDER_REVIEW
    if (booking.status === BookingStatus.REQUESTED || booking.status === BookingStatus.UNDER_REVIEW) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.APPROVED },
      });

      await this.auditService.logAction({
        action: 'CONFIRM_AVAILABILITY',
        entity: 'BOOKING',
        entityId: booking.id,
        entityKey: booking.bookingNumber,
        userId: actorUserId,
        description: `Availability confirmed for booking #${booking.bookingNumber} (${booking.status} → APPROVED)`,
        oldValue: { status: booking.status },
        newValue: { status: BookingStatus.APPROVED },
      });
    }

    // 2. Trigger Payment Request with exact authoritative amount
    const paymentResult = await this.sendPaymentRequest(bookingId, actorUserId, force);

    return {
      ...paymentResult,
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: paymentResult.status,
      },
    };
  }
}
