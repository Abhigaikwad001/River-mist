import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CapacityService } from '../capacity/capacity.service';
import { QuoteStatus, BookingStatus, EventType } from '@prisma/client';
import { normalizeToIstDateRange } from '../common/utils/date.util';

describe('QuotesService', () => {
  let service: QuotesService;
  let prisma: any;
  let tx: any;
  let capacityService: any;
  let auditService: any;
  let notificationsService: any;

  beforeEach(async () => {
    tx = {
      package: {
        findUnique: jest.fn().mockResolvedValue({ id: 99, slug: 'custom-event' }),
        create: jest.fn().mockResolvedValue({ id: 99, slug: 'custom-event' }),
      },
      booking: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve({ id: 101, ...args.data })
        ),
      },
      weddingQuote: {
        update: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: args.where.id,
            ...args.data,
            booking: { id: 101, bookingNumber: 'RM-2026-000001' },
          })
        ),
      },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
      weddingQuote: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      resource: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, name: 'Wedding Lawn', type: 'VENUE', capacity: 1000, active: true },
          { id: 2, name: 'Main Dining', type: 'VENUE', capacity: 200, active: true },
          { id: 3, name: 'Parking', type: 'FACILITY', capacity: 200, active: true },
        ]),
        findFirst: jest.fn().mockResolvedValue({ id: 1, name: 'Wedding Lawn', type: 'VENUE', capacity: 1000, active: true }),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    capacityService = {
      validateAndLockCapacity: jest.fn().mockResolvedValue(true),
      getAvailabilityReport: jest.fn(),
    };

    auditService = {
      logAction: jest.fn().mockResolvedValue(undefined),
    };

    notificationsService = {
      sendQuoteCreated: jest.fn().mockResolvedValue(undefined),
      sendQuoteStatusUpdated: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CapacityService, useValue: capacityService },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('convertQuoteToBooking', () => {
    const mockQuote = {
      id: 5,
      quoteNumber: 'WQ-2026-00005',
      userId: 42,
      eventDate: new Date('2026-11-20T10:00:00.000Z'),
      guestCount: 150,
      subtotal: 150000,
      total: 177000,
      advanceRequired: 44250,
      status: QuoteStatus.APPROVED,
      bookingId: null,
      eventType: EventType.WEDDING,
      venueRequirements: 'Grand lawn setup',
      notes: 'Vegan catering preferred',
      items: [{ id: 1, category: 'FOOD', description: 'Buffet', amount: 150000 }],
      user: { id: 42, name: 'Priya Sharma', email: 'priya@example.com' },
    };

    it('should throw BadRequestException if quote does not exist', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue(null);

      await expect(service.convertQuoteToBooking(999)).rejects.toThrow(BadRequestException);
      await expect(service.convertQuoteToBooking(999)).rejects.toThrow('Quote not found');
    });

    it('should throw BadRequestException if quote status is not APPROVED', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: QuoteStatus.DRAFT,
      });

      await expect(service.convertQuoteToBooking(5)).rejects.toThrow(BadRequestException);
      await expect(service.convertQuoteToBooking(5)).rejects.toThrow('Quote must be APPROVED before conversion');
    });

    it('should throw BadRequestException if quote is already converted to a booking', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue({
        ...mockQuote,
        bookingId: 88,
      });

      await expect(service.convertQuoteToBooking(5)).rejects.toThrow(BadRequestException);
      await expect(service.convertQuoteToBooking(5)).rejects.toThrow('Quote is already converted to a booking');
    });

    it('should throw BadRequestException if quote guest count is less than 1', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue({
        ...mockQuote,
        guestCount: 0,
      });

      await expect(service.convertQuoteToBooking(5)).rejects.toThrow(BadRequestException);
      await expect(service.convertQuoteToBooking(5)).rejects.toThrow('Quote guest count must be at least 1');
    });

    it('should successfully convert quote to booking, validate capacity, and reserve resources', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue(mockQuote);

      const result = await service.convertQuoteToBooking(5, 1);

      expect(prisma.weddingQuote.findUnique).toHaveBeenCalledWith({
        where: { id: 5 },
        include: { items: true, user: true },
      });

      // Validates capacity inside transaction
      expect(capacityService.validateAndLockCapacity).toHaveBeenCalledTimes(1);
      const [calledTx, calledTargetDate, calledResourceReqs] = capacityService.validateAndLockCapacity.mock.calls[0];
      expect(calledTx).toBe(tx);

      // Verify date normalization: normalized to start of IST day
      const { startOfDay: expectedDate } = normalizeToIstDateRange(mockQuote.eventDate);
      expect(calledTargetDate.getTime()).toBe(expectedDate.getTime());

      // Verify resources: Wedding Lawn (150), Main Dining (150), Parking (ceil(150/5) = 30)
      expect(calledResourceReqs).toEqual([
        { resourceId: 1, quantity: 150 },
        { resourceId: 2, quantity: 150 },
        { resourceId: 3, quantity: 30 },
      ]);

      // Verify booking creation in transaction
      expect(tx.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingNumber: expect.stringMatching(/^RM-2026-\d{6}/),
          date: expectedDate,
          type: EventType.WEDDING,
          status: BookingStatus.REQUESTED,
          userId: 42,
          packageId: 99,
          headCountAdult: 150,
          headCountChild: 0,
          totalAmount: 177000,
          advanceRequired: 44250,
          resources: {
            create: [
              { resource: { connect: { id: 1 } }, quantity: 150 },
              { resource: { connect: { id: 2 } }, quantity: 150 },
              { resource: { connect: { id: 3 } }, quantity: 30 },
            ],
          },
        }),
      });

      // Verify quote status updated to CONVERTED
      expect(tx.weddingQuote.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {
          status: QuoteStatus.CONVERTED,
          bookingId: 101,
        },
        include: { items: true, user: true, booking: true },
      });

      // Verify audit logging
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STATUS_CHANGE',
          entity: 'QUOTE',
          entityId: 5,
          userId: 1,
          newValue: { status: QuoteStatus.CONVERTED, bookingId: 101 },
        })
      );

      expect(result.status).toBe(QuoteStatus.CONVERTED);
      expect(result.bookingId).toBe(101);
    });

    it('should reject quote conversion when date is blacked out (blackout date)', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue(mockQuote);
      capacityService.validateAndLockCapacity.mockRejectedValue(
        new ConflictException('Sorry, River Mist is closed on 2026-11-20: Private VIP Event.')
      );

      await expect(service.convertQuoteToBooking(5)).rejects.toThrow(ConflictException);
      await expect(service.convertQuoteToBooking(5)).rejects.toThrow(
        'Sorry, River Mist is closed on 2026-11-20: Private VIP Event.'
      );

      // Verify booking creation was NOT called
      expect(tx.booking.create).not.toHaveBeenCalled();
      expect(tx.weddingQuote.update).not.toHaveBeenCalled();
    });

    it('should respect daily capacity overrides during quote conversion', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue(mockQuote);
      // When an override is present, validateAndLockCapacity succeeds when within override limits
      capacityService.validateAndLockCapacity.mockResolvedValue(true);

      const result = await service.convertQuoteToBooking(5);

      expect(capacityService.validateAndLockCapacity).toHaveBeenCalled();
      expect(tx.booking.create).toHaveBeenCalled();
      expect(result.status).toBe(QuoteStatus.CONVERTED);
    });

    it('should throw ConflictException on insufficient resource capacity during quote conversion', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue(mockQuote);
      capacityService.validateAndLockCapacity.mockRejectedValue(
        new ConflictException(
          'Sorry, the selected date is currently unavailable for Wedding Lawn. (Available: 50, Requested: 150)'
        )
      );

      await expect(service.convertQuoteToBooking(5)).rejects.toThrow(ConflictException);
      await expect(service.convertQuoteToBooking(5)).rejects.toThrow(
        'Sorry, the selected date is currently unavailable for Wedding Lawn. (Available: 50, Requested: 150)'
      );

      // Verify no booking was created
      expect(tx.booking.create).not.toHaveBeenCalled();
      expect(tx.weddingQuote.update).not.toHaveBeenCalled();
    });

    it('should correctly normalize IST date boundaries for late-night UTC timestamps', async () => {
      // 2026-10-15T20:00:00.000Z is 2026-10-16 01:30:00 AM IST
      const lateNightQuote = {
        ...mockQuote,
        eventDate: new Date('2026-10-15T20:00:00.000Z'),
      };
      prisma.weddingQuote.findUnique.mockResolvedValue(lateNightQuote);

      await service.convertQuoteToBooking(5);

      const [, targetDate] = capacityService.validateAndLockCapacity.mock.calls[0];
      const { startOfDay: expectedIstStartOfDay, dateStr } = normalizeToIstDateRange('2026-10-15T20:00:00.000Z');

      expect(dateStr).toBe('2026-10-16');
      expect(targetDate.getTime()).toBe(expectedIstStartOfDay.getTime());
    });

    it('should select Wedding Hall when venueRequirements explicitly specify hall', async () => {
      const hallQuote = {
        ...mockQuote,
        venueRequirements: 'Require indoor banquet Hall for evening reception',
      };
      prisma.resource.findMany.mockResolvedValue([
        { id: 10, name: 'Wedding Hall', type: 'VENUE', capacity: 500, active: true },
        { id: 2, name: 'Main Dining', type: 'VENUE', capacity: 200, active: true },
        { id: 3, name: 'Parking', type: 'FACILITY', capacity: 200, active: true },
      ]);
      prisma.weddingQuote.findUnique.mockResolvedValue(hallQuote);

      await service.convertQuoteToBooking(5);

      const [, , resourceReqs] = capacityService.validateAndLockCapacity.mock.calls[0];
      expect(resourceReqs).toContainEqual({ resourceId: 10, quantity: 150 });
    });

    it('should throw BadRequestException if no active venue resource is configured', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue(mockQuote);
      prisma.resource.findMany.mockResolvedValue([]);
      prisma.resource.findFirst.mockResolvedValue(null);

      await expect(service.convertQuoteToBooking(5)).rejects.toThrow(BadRequestException);
      await expect(service.convertQuoteToBooking(5)).rejects.toThrow(
        'No active venue resource configured for WEDDING'
      );
    });
  });

  describe('updateQuoteStatus (Capacity Bypass Prevention)', () => {
    it('should throw BadRequestException when attempting to set status to CONVERTED directly', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue({
        id: 5,
        status: QuoteStatus.APPROVED,
        quoteNumber: 'WQ-2026-00005',
        user: { email: 'guest@example.com', name: 'Guest' },
      });

      await expect(service.updateQuoteStatus(5, QuoteStatus.CONVERTED, 1)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.updateQuoteStatus(5, QuoteStatus.CONVERTED, 1)).rejects.toThrow(
        'Direct status change to CONVERTED is not allowed. Please use convertQuoteToBooking to validate capacity and generate booking.'
      );
      expect(prisma.weddingQuote.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when attempting to modify an already converted quote', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue({
        id: 5,
        status: QuoteStatus.CONVERTED,
        quoteNumber: 'WQ-2026-00005',
        user: { email: 'guest@example.com', name: 'Guest' },
      });

      await expect(service.updateQuoteStatus(5, QuoteStatus.APPROVED, 1)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.updateQuoteStatus(5, QuoteStatus.APPROVED, 1)).rejects.toThrow(
        'Cannot modify status of an already converted quote'
      );
      expect(prisma.weddingQuote.update).not.toHaveBeenCalled();
    });

    it('should allow valid status transitions like DRAFT to APPROVED and emit notifications and audit logs', async () => {
      prisma.weddingQuote.findUnique.mockResolvedValue({
        id: 5,
        status: QuoteStatus.DRAFT,
        quoteNumber: 'WQ-2026-00005',
        user: { email: 'guest@example.com', name: 'Guest' },
      });
      prisma.weddingQuote.update.mockResolvedValue({
        id: 5,
        status: QuoteStatus.APPROVED,
        quoteNumber: 'WQ-2026-00005',
        user: { email: 'guest@example.com', name: 'Guest' },
      });

      const result = await service.updateQuoteStatus(5, QuoteStatus.APPROVED, 1);
      expect(result.status).toBe(QuoteStatus.APPROVED);
      expect(prisma.weddingQuote.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: QuoteStatus.APPROVED },
        include: { user: true },
      });
      expect(notificationsService.sendQuoteStatusUpdated).toHaveBeenCalled();
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STATUS_CHANGE',
          entity: 'QUOTE',
          entityId: 5,
          userId: 1,
        })
      );
    });
  });
});
