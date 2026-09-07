import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getEvents(filters: any = {}) {
    return this.prisma.event.findMany({
      where: filters,
      orderBy: [
        { displayOrder: 'asc' },
        { eventDate: 'asc' }
      ],
      include: { media: true }
    });
  }

  async getEventById(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { media: true }
    });
    if (!event) {
      throw new NotFoundException(`Event #${id} not found`);
    }
    return event;
  }

  private processData(data: any) {
    const processed = { ...data };
    if (processed.price !== undefined) {
      const parsedPrice = Number(processed.price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new BadRequestException('Event price must be a non-negative number');
      }
      processed.price = parsedPrice;
    }
    if (processed.displayOrder !== undefined) {
      const parsedOrder = Number(processed.displayOrder);
      if (isNaN(parsedOrder) || parsedOrder < 0) {
        throw new BadRequestException('Display order must be a non-negative number');
      }
      processed.displayOrder = parsedOrder;
    }
    if (processed.capacity !== undefined && processed.capacity !== null) {
      const parsedCap = Number(processed.capacity);
      if (isNaN(parsedCap) || parsedCap < 0) {
        throw new BadRequestException('Capacity must be a non-negative number');
      }
      processed.capacity = parsedCap === 0 ? null : parsedCap;
    }
    if (processed.eventDate) {
      processed.eventDate = new Date(processed.eventDate);
    }
    return processed;
  }

  async createEvent(data: CreateEventDto, userId?: number) {
    const newEvent = await this.prisma.event.create({ data: this.processData(data) });

    await this.auditService.logAction({
      action: 'CREATE',
      entity: 'EVENT',
      entityId: newEvent.id,
      userId,
      description: `Created event "${newEvent.title}" (Date: ${newEvent.eventDate})`,
      newValue: {
        title: newEvent.title,
        price: newEvent.price,
        active: newEvent.active,
      },
    });

    return newEvent;
  }

  async updateEvent(id: number, data: UpdateEventDto, userId?: number) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Event #${id} not found`);
    }
    const updated = await this.prisma.event.update({ where: { id }, data: this.processData(data) });

    await this.auditService.logAction({
      action: 'UPDATE',
      entity: 'EVENT',
      entityId: updated.id,
      userId,
      description: `Updated event "${updated.title}"`,
      oldValue: {
        title: existing.title,
        price: existing.price,
        active: existing.active,
      },
      newValue: {
        title: updated.title,
        price: updated.price,
        active: updated.active,
      },
    });

    return updated;
  }

  async deleteEvent(id: number, userId?: number) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Event #${id} not found`);
    }
    const deleted = await this.prisma.event.delete({ where: { id } });

    await this.auditService.logAction({
      action: 'DELETE',
      entity: 'EVENT',
      entityId: id,
      userId,
      description: `Deleted event "${existing.title}"`,
      oldValue: {
        title: existing.title,
        price: existing.price,
      },
    });

    return deleted;
  }
}
