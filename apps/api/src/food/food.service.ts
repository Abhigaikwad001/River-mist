import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class FoodService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

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

  async createMenuItem(data: CreateMenuItemDto, userId?: number) {
    const newItem = await this.prisma.menuItem.create({ data: this.processData(data) });

    await this.auditService.logAction({
      action: 'CREATE',
      entity: 'FOOD',
      entityId: newItem.id,
      userId,
      description: `Created food/thali item "${newItem.name}" (${newItem.category})`,
      newValue: {
        name: newItem.name,
        category: newItem.category,
        active: newItem.active,
      },
    });

    return newItem;
  }

  async updateMenuItem(id: number, data: UpdateMenuItemDto, userId?: number) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Menu item #${id} not found`);
    }
    const updated = await this.prisma.menuItem.update({ where: { id }, data: this.processData(data) });

    await this.auditService.logAction({
      action: 'UPDATE',
      entity: 'FOOD',
      entityId: updated.id,
      userId,
      description: `Updated food/thali item "${updated.name}"`,
      oldValue: {
        name: existing.name,
        category: existing.category,
        active: existing.active,
      },
      newValue: {
        name: updated.name,
        category: updated.category,
        active: updated.active,
      },
    });

    return updated;
  }

  async deleteMenuItem(id: number, userId?: number) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Menu item #${id} not found`);
    }
    const deleted = await this.prisma.menuItem.delete({ where: { id } });

    await this.auditService.logAction({
      action: 'DELETE',
      entity: 'FOOD',
      entityId: id,
      userId,
      description: `Deleted food/thali item "${existing.name}"`,
      oldValue: {
        name: existing.name,
        category: existing.category,
      },
    });

    return deleted;
  }
}
