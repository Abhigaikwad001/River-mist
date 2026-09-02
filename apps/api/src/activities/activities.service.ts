import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async getActivities(filters: any = {}) {
    return this.prisma.activity.findMany({ where: filters, orderBy: { name: 'asc' } });
  }

  async getActivityById(id: number) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new Error(`Activity with ID ${id} not found`);
    return activity;
  }

  async createActivity(data: any) {
    if (data.price) data.price = Number(data.price);
    if (data.maxParticipants) data.maxParticipants = Number(data.maxParticipants);
    if (data.durationMins) data.durationMins = Number(data.durationMins);
    return this.prisma.activity.create({ data });
  }

  async updateActivity(id: number, data: any) {
    if (data.price) data.price = Number(data.price);
    if (data.maxParticipants) data.maxParticipants = Number(data.maxParticipants);
    if (data.durationMins) data.durationMins = Number(data.durationMins);
    return this.prisma.activity.update({ where: { id }, data });
  }

  async deleteActivity(id: number) {
    return this.prisma.activity.delete({ where: { id } });
  }
}
