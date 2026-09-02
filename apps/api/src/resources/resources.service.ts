import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async getResources() {
    return this.prisma.resource.findMany({ orderBy: { name: 'asc' } });
  }

  async createResource(data: any) {
    if (data.capacity) data.capacity = Number(data.capacity);
    return this.prisma.resource.create({ data });
  }

  async updateResource(id: number, data: any) {
    if (data.capacity) data.capacity = Number(data.capacity);
    return this.prisma.resource.update({ where: { id }, data });
  }

  async deleteResource(id: number) {
    return this.prisma.resource.delete({ where: { id } });
  }
}
