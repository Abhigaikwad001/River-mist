import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getActivities(filters: any = {}) {
    return this.prisma.activity.findMany({ 
      where: filters, 
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ],
      include: { media: true }
    });
  }

  async getActivityById(id: number) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: { media: true }
    });
    if (!activity) {
      throw new NotFoundException(`Activity #${id} not found`);
    }
    return activity;
  }

  private processData(data: any) {
    const processed = { ...data };
    if (processed.price !== undefined) {
      const parsedPrice = Number(processed.price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new BadRequestException('Activity price must be a non-negative number');
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
    return processed;
  }

  async createActivity(data: CreateActivityDto, userId?: number) {
    const newActivity = await this.prisma.activity.create({ data: this.processData(data) });

    await this.auditService.logAction({
      action: 'CREATE',
      entity: 'ACTIVITY',
      entityId: newActivity.id,
      userId,
      description: `Created activity "${newActivity.name}" (Price: ₹${newActivity.price})`,
      newValue: {
        name: newActivity.name,
        category: newActivity.category,
        price: newActivity.price,
        active: newActivity.active,
      },
    });

    return newActivity;
  }

  async updateActivity(id: number, data: UpdateActivityDto, userId?: number) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Activity #${id} not found`);
    }
    const updated = await this.prisma.activity.update({ where: { id }, data: this.processData(data) });

    await this.auditService.logAction({
      action: 'UPDATE',
      entity: 'ACTIVITY',
      entityId: updated.id,
      userId,
      description: `Updated activity "${updated.name}"`,
      oldValue: {
        name: existing.name,
        price: existing.price,
        active: existing.active,
      },
      newValue: {
        name: updated.name,
        price: updated.price,
        active: updated.active,
      },
    });

    return updated;
  }

  async deleteActivity(id: number, userId?: number) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Activity #${id} not found`);
    }
    const deleted = await this.prisma.activity.delete({ where: { id } });

    await this.auditService.logAction({
      action: 'DELETE',
      entity: 'ACTIVITY',
      entityId: id,
      userId,
      description: `Deleted activity "${existing.name}"`,
      oldValue: {
        name: existing.name,
        category: existing.category,
      },
    });

    return deleted;
  }
}
