import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async getMedia(filters: any = {}) {
    return this.prisma.media.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' }
    });
  }

  async createMedia(data: any) {
    // Validations could be added here
    return this.prisma.media.create({ data });
  }

  async updateMedia(id: number, data: any) {
    return this.prisma.media.update({ where: { id }, data });
  }

  async deleteMedia(id: number) {
    return this.prisma.media.delete({ where: { id } });
  }
}
