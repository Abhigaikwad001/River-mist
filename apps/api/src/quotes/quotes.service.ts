import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuoteStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';

@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  async createQuote(data: { 
    name: string; 
    email: string; 
    phone: string; 
    eventDate: string; 
    guestCount: number; 
    eventType?: string;
    venueRequirements?: string;
    foodRequirements?: string;
    decorationRequirements?: string;
    djMusicRequirements?: string;
    photographyRequirements?: string;
    specialRequirements?: string;
    notes?: string;
  }, authUserId?: number) {
    // Determine the user to attach this quote to
    let userId = authUserId;
    if (!userId) {
      // Find or create a user by email, or fallback to guest
      let user = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (!user) {
        // Create a new user for this lead
        user = await this.prisma.user.create({
          data: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            passwordHash: `$LEAD$${crypto.randomBytes(32).toString('hex')}`, // Unguessable — lead accounts cannot be logged into
            role: 'USER',
          }
        });
      }
      userId = user.id;
    }

    // Generate Quote Number
    const count = await this.prisma.weddingQuote.count();
    const quoteNumber = `WQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const quote = await this.prisma.weddingQuote.create({
      data: {
        quoteNumber,
        userId,
        eventDate: new Date(data.eventDate),
        eventType: (data.eventType as any) || 'WEDDING',
        guestCount: data.guestCount,
        venueRequirements: data.venueRequirements,
        foodRequirements: data.foodRequirements,
        decorationRequirements: data.decorationRequirements,
        djMusicRequirements: data.djMusicRequirements,
        photographyRequirements: data.photographyRequirements,
        specialRequirements: data.specialRequirements,
        notes: data.notes,
        subtotal: 0,
        total: 0,
        advanceRequired: 0,
        status: QuoteStatus.DRAFT,
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: true
      }
    });

    // Fire & forget notification
    this.notificationsService.sendQuoteCreated(
      quote.id,
      quote.user.email,
      quote.user.name,
      quote.quoteNumber
    ).catch((err: unknown) => console.error('Failed to dispatch quote creation notification:', err));

    return quote;
  }

  async getMyQuotes(userId: number) {
    return this.prisma.weddingQuote.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } }
      }
    });
  }

  async getAllQuotes(type?: string) {
    let whereClause = {};
    if (type === 'wedding') {
      whereClause = { eventType: { in: ['WEDDING', 'DESTINATION_WEDDING', 'ENGAGEMENT'] } };
    } else if (type === 'event') {
      whereClause = { eventType: { notIn: ['WEDDING', 'DESTINATION_WEDDING', 'ENGAGEMENT'] } };
    }

    return this.prisma.weddingQuote.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: true
      }
    });
  }

  async updateQuoteItems(quoteId: number, items: { category: string; description: string; amount: number }[]) {
    const quote = await this.prisma.weddingQuote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new BadRequestException('Quote not found');

    return this.prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.quoteItem.deleteMany({ where: { quoteId } });
      
      // Create new items
      if (items && items.length > 0) {
        await tx.quoteItem.createMany({
          data: items.map(item => ({
            quoteId,
            category: item.category,
            description: item.description,
            amount: item.amount
          }))
        });
      }

      // Calculate total
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const taxRate = process.env.TAX_RATE ? parseFloat(process.env.TAX_RATE) : 0;
      const total = subtotal + Math.floor(subtotal * taxRate);
      const advanceRequired = Math.floor(total * 0.25); // 25% for weddings

      return tx.weddingQuote.update({
        where: { id: quoteId },
        data: { subtotal, total, advanceRequired },
        include: { items: true, user: true }
      });
    });
  }

  async convertQuoteToBooking(quoteId: number) {
    const quote = await this.prisma.weddingQuote.findUnique({
      where: { id: quoteId },
      include: { items: true, user: true }
    });

    if (!quote) throw new BadRequestException('Quote not found');
    if (quote.status !== QuoteStatus.APPROVED) throw new BadRequestException('Quote must be APPROVED before conversion');
    if (quote.bookingId) throw new BadRequestException('Quote is already converted to a booking');

    return this.prisma.$transaction(async (tx) => {
      // Find or create a generic custom event package
      let customPackage = await tx.package.findUnique({ where: { slug: 'custom-event' } });
      if (!customPackage) {
        customPackage = await tx.package.create({
          data: {
            name: 'Custom Event',
            slug: 'custom-event',
            description: 'Autogenerated package for custom quotes and events.',
            experienceType: 'OTHER_EVENT',
            priceAdult: 0,
            priceChild: 0,
            active: false
          }
        });
      }

      const bookingCount = await tx.booking.count();
      const bookingNumber = `RM-${new Date().getFullYear()}-${String(bookingCount + 1).padStart(6, '0')}`;

      // Create Booking
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          date: quote.eventDate,
          type: quote.eventType,
          status: 'REQUESTED', // or PAYMENT_PENDING
          userId: quote.userId,
          packageId: customPackage.id,
          headCountAdult: quote.guestCount,
          headCountChild: 0,
          totalAmount: quote.total,
          advanceRequired: quote.advanceRequired,
          balanceAmount: quote.total,
          notes: `Converted from Quote ${quote.quoteNumber}\n\nNotes: ${quote.notes || ''}`
        }
      });

      // Update Quote Status
      const updatedQuote = await tx.weddingQuote.update({
        where: { id: quoteId },
        data: {
          status: QuoteStatus.CONVERTED,
          bookingId: booking.id
        },
        include: { items: true, user: true, booking: true }
      });

      return updatedQuote;
    });
  }

  async updateQuoteStatus(id: number, status: QuoteStatus) {
    const quote = await this.prisma.weddingQuote.findUnique({ 
      where: { id },
      include: { user: true }
    });
    if (!quote) throw new BadRequestException('Quote not found');

    const updatedQuote = await this.prisma.weddingQuote.update({
      where: { id },
      data: { status },
      include: { user: true }
    });

    // Fire & forget notification
    this.notificationsService.sendQuoteStatusUpdated(
      updatedQuote.id,
      updatedQuote.user.email,
      updatedQuote.user.name,
      updatedQuote.quoteNumber,
      updatedQuote.status
    ).catch((err: unknown) => console.error('Failed to dispatch quote status notification:', err));

    return updatedQuote;
  }
}
