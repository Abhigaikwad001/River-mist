import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteContentDto } from './dto/create-site-content.dto';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

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

  async upsertContent(dto: CreateSiteContentDto) {
    const sanitized = this.sanitizeInput(dto);
    const key = sanitized.key.trim();
    const category = (sanitized.category || 'GENERAL').toUpperCase();

    const mediaId = sanitized.mediaId ? Number(sanitized.mediaId) : null;

    return this.prisma.siteContent.upsert({
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
  }

  async deleteContent(key: string) {
    const normalizedKey = key.trim();
    await this.getContentByKey(normalizedKey);
    return this.prisma.siteContent.delete({
      where: { key: normalizedKey },
    });
  }
}
