import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async getContent(category?: string) {
    const where: any = { active: true };
    if (category) where.category = category;
    return this.prisma.siteContent.findMany({ where, include: { media: true } });
  }

  async getContentByKey(key: string) {
    const item = await this.prisma.siteContent.findUnique({ where: { key }, include: { media: true } });
    if (!item) {
      throw new NotFoundException(`Content block ${key} not found`);
    }
    return item;
  }

  async upsertContent(data: any) {
    return this.prisma.siteContent.upsert({
      where: { key: data.key },
      update: {
        title: data.title,
        subtitle: data.subtitle,
        content: data.content,
        image: data.image,
        category: data.category,
        active: data.active !== undefined ? data.active : true,
      },
      create: {
        key: data.key,
        title: data.title,
        subtitle: data.subtitle,
        content: data.content,
        image: data.image,
        category: data.category || 'GENERAL',
        active: data.active !== undefined ? data.active : true,
      },
    });
  }

  async deleteContent(key: string) {
    return this.prisma.siteContent.delete({ where: { key } });
  }
}
