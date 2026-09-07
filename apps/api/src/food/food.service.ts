import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class FoodService {
  constructor(private prisma: PrismaService) {}

  async getMenu(filters: any = {}) {
    return this.prisma.menuItem.findMany({
      where: filters,
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ],
      include: { media: true }
    });
  }

  private processData(data: any) {
    const processed = { ...data };
    if (processed.displayOrder !== undefined) {
      const parsedOrder = Number(processed.displayOrder);
      if (isNaN(parsedOrder) || parsedOrder < 0) {
        throw new BadRequestException('Display order must be a non-negative number');
      }
      processed.displayOrder = parsedOrder;
    }
    if (typeof processed.tags === 'string') {
      try {
        processed.tags = JSON.parse(processed.tags);
      } catch (e) {
        processed.tags = (processed.tags as string)
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }
    return processed;
  }

  async createMenuItem(data: CreateMenuItemDto) {
    return this.prisma.menuItem.create({ data: this.processData(data) });
  }

  async updateMenuItem(id: number, data: UpdateMenuItemDto) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Menu item #${id} not found`);
    }
    return this.prisma.menuItem.update({ where: { id }, data: this.processData(data) });
  }

  async deleteMenuItem(id: number) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Menu item #${id} not found`);
    }
    return this.prisma.menuItem.delete({ where: { id } });
  }
}
