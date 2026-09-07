import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

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

  async createActivity(data: CreateActivityDto) {
    return this.prisma.activity.create({ data: this.processData(data) });
  }

  async updateActivity(id: number, data: UpdateActivityDto) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Activity #${id} not found`);
    }
    return this.prisma.activity.update({ where: { id }, data: this.processData(data) });
  }

  async deleteActivity(id: number) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Activity #${id} not found`);
    }
    return this.prisma.activity.delete({ where: { id } });
  }
}
