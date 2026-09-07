import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as fs from 'fs';
import * as path from 'path';

export interface GetMediaParams {
  category?: string;
  type?: string;
  activeOnly?: boolean;
  isFeatured?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'displayOrder' | 'title' | 'category';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getMedia(params: GetMediaParams = {}) {
    const { category, type, activeOnly, isFeatured, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    const where: any = {};

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (type) {
      where.type = type.toUpperCase();
    }

    if (activeOnly) {
      where.active = true;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (search && search.trim() !== '') {
      const query = search.trim();
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { altText: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    const orderBy: any[] = [];
    if (sortBy === 'displayOrder') {
      orderBy.push({ displayOrder: sortOrder });
      orderBy.push({ createdAt: 'desc' });
    } else {
      orderBy.push({ [sortBy]: sortOrder });
    }

    return this.prisma.media.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: {
            packages: true,
            activities: true,
            events: true,
            menuItems: true,
            siteContents: true,
          },
        },
      },
    });
  }

  async getMediaById(id: number) {
    const item = await this.prisma.media.findUnique({
      where: { id },
      include: {
        packages: true,
        activities: true,
        events: true,
        menuItems: true,
        siteContents: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Media asset #${id} not found`);
    }

    return item;
  }

  async createMedia(data: any, userId?: number) {
    if (!data.url) {
      throw new BadRequestException('Media URL is required');
    }

    const category = (data.category || 'GALLERY').toUpperCase();
    const type = (data.type || 'IMAGE').toUpperCase();

    const created = await this.prisma.media.create({
      data: {
        type,
        url: data.url,
        title: data.title || null,
        altText: data.altText || null,
        description: data.description || null,
        category,
        active: data.active !== undefined ? Boolean(data.active) : true,
        isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : false,
        displayOrder: data.displayOrder ? Number(data.displayOrder) : 0,
        fileSize: data.fileSize ? Number(data.fileSize) : null,
        mimeType: data.mimeType || null,
        width: data.width ? Number(data.width) : null,
        height: data.height ? Number(data.height) : null,
      },
    });

    await this.auditService.logAction({
      action: 'CREATE',
      entity: 'MEDIA',
      entityId: created.id,
      userId,
      description: `Uploaded/added media asset "${created.title || created.url}" (${created.category})`,
      newValue: {
        url: created.url,
        category: created.category,
        title: created.title,
        active: created.active,
      },
    });

    return created;
  }

  async updateMedia(id: number, data: any, userId?: number) {
    const existing = await this.getMediaById(id);

    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type.toUpperCase();
    if (data.url !== undefined) updateData.url = data.url;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.altText !== undefined) updateData.altText = data.altText;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category.toUpperCase();
    if (data.active !== undefined) updateData.active = Boolean(data.active);
    if (data.isFeatured !== undefined) updateData.isFeatured = Boolean(data.isFeatured);
    if (data.displayOrder !== undefined) updateData.displayOrder = Number(data.displayOrder);
    if (data.fileSize !== undefined) updateData.fileSize = Number(data.fileSize);
    if (data.mimeType !== undefined) updateData.mimeType = data.mimeType;

    const updated = await this.prisma.media.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.logAction({
      action: 'UPDATE',
      entity: 'MEDIA',
      entityId: updated.id,
      userId,
      description: `Updated media asset #${updated.id} "${updated.title || updated.url}"`,
      oldValue: {
        title: existing.title,
        category: existing.category,
        active: existing.active,
      },
      newValue: {
        title: updated.title,
        category: updated.category,
        active: updated.active,
      },
    });

    return updated;
  }

  async deleteMedia(id: number, userId?: number) {
    const item = await this.getMediaById(id);

    // If local file, attempt cleanup
    if (item.url && item.url.startsWith('/uploads/')) {
      const fileName = item.url.replace('/uploads/', '');
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Failed to delete local media file ${filePath}:`, err);
        }
      }
    }

    const deleted = await this.prisma.media.delete({ where: { id } });

    await this.auditService.logAction({
      action: 'DELETE',
      entity: 'MEDIA',
      entityId: id,
      userId,
      description: `Deleted media asset #${id} "${item.title || item.url}"`,
      oldValue: {
        url: item.url,
        category: item.category,
      },
    });

    return deleted;
  }

  async bulkOperation(action: string, ids: number[], payload: any = {}, userId?: number) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('At least one media ID must be specified');
    }

    const upperAction = action.toUpperCase();

    await this.auditService.logAction({
      action: `BULK_${upperAction}`,
      entity: 'MEDIA',
      userId,
      description: `Performed bulk operation ${upperAction} on ${ids.length} media items`,
      metadata: { ids, payload },
    });

    switch (upperAction) {
      case 'ACTIVATE':
        return this.prisma.media.updateMany({
          where: { id: { in: ids } },
          data: { active: true },
        });

      case 'DEACTIVATE':
        return this.prisma.media.updateMany({
          where: { id: { in: ids } },
          data: { active: false },
        });

      case 'CHANGE_CATEGORY':
        if (!payload.category) {
          throw new BadRequestException('Target category must be specified for CHANGE_CATEGORY');
        }
        return this.prisma.media.updateMany({
          where: { id: { in: ids } },
          data: { category: payload.category.toUpperCase() },
        });

      case 'DELETE':
        // Clean up any local files
        const items = await this.prisma.media.findMany({
          where: { id: { in: ids } },
        });
        for (const item of items) {
          if (item.url && item.url.startsWith('/uploads/')) {
            const fileName = item.url.replace('/uploads/', '');
            const filePath = path.join(process.cwd(), 'uploads', fileName);
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (err) {
                console.error(`Failed to delete file ${filePath}:`, err);
              }
            }
          }
        }
        return this.prisma.media.deleteMany({
          where: { id: { in: ids } },
        });

      case 'REORDER':
        if (Array.isArray(payload.orders)) {
          const updates = payload.orders.map((item: { id: number; displayOrder: number }) =>
            this.prisma.media.update({
              where: { id: item.id },
              data: { displayOrder: Number(item.displayOrder) },
            })
          );
          return await Promise.all(updates);
        }
        throw new BadRequestException('Invalid reorder payload format');

      default:
        throw new BadRequestException(`Unsupported bulk action: ${action}`);
    }
  }
}
