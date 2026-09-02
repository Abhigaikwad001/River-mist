import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FoodService {
  constructor(private prisma: PrismaService) {}

  async getMenu(filters: any = {}) {
    return this.prisma.menuItem.findMany({
      where: filters,
      orderBy: [
        { meal: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  async createMenuItem(data: any) {
    return this.prisma.menuItem.create({ data });
  }

  async updateMenuItem(id: number, data: any) {
    return this.prisma.menuItem.update({ where: { id }, data });
  }

  async deleteMenuItem(id: number) {
    return this.prisma.menuItem.delete({ where: { id } });
  }
}
