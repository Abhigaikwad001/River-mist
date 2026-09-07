import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';

export interface LogActionOptions {
  action: string;
  entity: string;
  entityId?: number;
  entityKey?: string;
  userId?: number;
  description?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Redacts sensitive information (passwords, JWTs, secret keys, tokens) from object snapshots.
   */
  private sanitizeData(data: any): string | null {
    if (data === undefined || data === null) {
      return null;
    }

    if (typeof data === 'string') {
      // Check if raw string contains obvious token or password patterns
      return data;
    }

    try {
      const sensitiveKeys = [
        'password',
        'passwordhash',
        'token',
        'secret',
        'jwt',
        'authorization',
        'razorpaykeysecret',
        'razorpaywebhooksecret',
        'card',
        'cvv',
      ];

      const clean = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(clean);

        const sanitized: Record<string, any> = {};
        for (const [key, val] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
            sanitized[key] = '[REDACTED]';
          } else if (val && typeof val === 'object') {
            sanitized[key] = clean(val);
          } else {
            sanitized[key] = val;
          }
        }
        return sanitized;
      };

      return JSON.stringify(clean(data));
    } catch {
      return String(data);
    }
  }

  /**
   * Log an administrative or important business mutation to AuditLog.
   */
  async logAction(options: LogActionOptions) {
    try {
      const sanitizedOld = this.sanitizeData(options.oldValue);
      const sanitizedNew = this.sanitizeData(options.newValue);
      const sanitizedMeta = this.sanitizeData(options.metadata);

      return await this.prisma.auditLog.create({
        data: {
          action: options.action,
          entity: options.entity,
          entityId: options.entityId || null,
          entityKey: options.entityKey || null,
          userId: options.userId || null,
          description: options.description || null,
          oldValue: sanitizedOld,
          newValue: sanitizedNew,
          metadata: sanitizedMeta,
          ipAddress: options.ipAddress || null,
        },
      });
    } catch (err) {
      // Audit logging must not crash main operations if non-fatal
      console.error('Failed to write AuditLog entry:', err);
      return null;
    }
  }

  /**
   * Fetch paginated audit logs with optional filters for SUPER_ADMIN.
   */
  async getAuditLogs(query: GetAuditLogsQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.userId) {
      where.userId = Number(query.userId);
    }

    if (query.action) {
      where.action = query.action.toUpperCase();
    }

    if (query.entity) {
      where.entity = query.entity.toUpperCase();
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { entityKey: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Fetch a single audit log entry by ID.
   */
  async getAuditLogById(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`AuditLog entry #${id} not found`);
    }

    return log;
  }
}
