import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSiteContentDto } from './dto/create-site-content.dto';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Helper to sanitize text and validate URLs against XSS / dangerous schemes
   */
  private sanitizeInput(data: CreateSiteContentDto): CreateSiteContentDto {
    const sanitized = { ...data };

    // Validate image URL scheme if present
    if (sanitized.image && sanitized.image.trim() !== '') {
      const trimmedUrl = sanitized.image.trim().toLowerCase();
      if (trimmedUrl.startsWith('javascript:') || trimmedUrl.startsWith('data:text/html')) {
        throw new BadRequestException('Unsafe image URL protocol detected');
      }
    }

    // Sanitize string fields against script tags
    if (sanitized.title) {
      sanitized.title = sanitized.title.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (sanitized.subtitle) {
      sanitized.subtitle = sanitized.subtitle.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (sanitized.content) {
      sanitized.content = sanitized.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    return sanitized;
  }

  async getContent(category?: string, activeOnly: boolean = true) {
    const where: any = {};
    if (activeOnly) {
      where.active = true;
    }
    if (category && category !== 'ALL') {
      where.category = category.toUpperCase();
    }

    return this.prisma.siteContent.findMany({
      where,
      include: { media: true },
      orderBy: { key: 'asc' },
    });
  }

  async getContentByKey(key: string) {
    const normalizedKey = key.trim();
    const item = await this.prisma.siteContent.findUnique({
      where: { key: normalizedKey },
      include: { media: true },
    });
    if (!item) {
      throw new NotFoundException(`Content block '${normalizedKey}' not found`);
    }
    return item;
  }

  async upsertContent(dto: CreateSiteContentDto, userId?: number) {
    const sanitized = this.sanitizeInput(dto);
    const key = sanitized.key.trim();
    const category = (sanitized.category || 'GENERAL').toUpperCase();

    const mediaId = sanitized.mediaId ? Number(sanitized.mediaId) : null;

    const existing = await this.prisma.siteContent.findUnique({ where: { key } });

    const result = await this.prisma.siteContent.upsert({
      where: { key },
      update: {
        title: sanitized.title,
        subtitle: sanitized.subtitle || null,
        content: sanitized.content || null,
        image: sanitized.image || null,
        category,
        active: sanitized.active !== undefined ? Boolean(sanitized.active) : true,
        mediaId,
      },
      create: {
        key,
        title: sanitized.title,
        subtitle: sanitized.subtitle || null,
        content: sanitized.content || null,
        image: sanitized.image || null,
        category,
        active: sanitized.active !== undefined ? Boolean(sanitized.active) : true,
        mediaId,
      },
      include: { media: true },
    });

    const action = existing ? 'UPDATE' : 'CREATE';

    await this.auditService.logAction({
      action,
      entity: 'CONTENT',
      entityKey: key,
      entityId: result.id,
      userId,
      description: `${action === 'CREATE' ? 'Created' : 'Updated'} website content block "${key}"`,
      oldValue: existing
        ? {
            title: existing.title,
            subtitle: existing.subtitle,
            content: existing.content,
            active: existing.active,
          }
        : null,
      newValue: {
        title: result.title,
        subtitle: result.subtitle,
        content: result.content,
        active: result.active,
      },
    });

    return result;
  }

  async deleteContent(key: string, userId?: number) {
    const normalizedKey = key.trim();
    const existing = await this.getContentByKey(normalizedKey);
    const deleted = await this.prisma.siteContent.delete({
      where: { key: normalizedKey },
    });

    await this.auditService.logAction({
      action: 'DELETE',
      entity: 'CONTENT',
      entityKey: normalizedKey,
      entityId: existing.id,
      userId,
      description: `Deleted website content block "${normalizedKey}"`,
      oldValue: {
        title: existing.title,
        category: existing.category,
      },
    });

    return deleted;
  }
}
