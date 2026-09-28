import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { GetResourcesQueryDto } from './dto/get-resources-query.dto';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Fetch resources with optional inactive inclusion, type filtering, and search.
   * Includes historical booking count to ensure visibility of resource utilization.
   */
  async getResources(query?: GetResourcesQueryDto & { all?: string | boolean }) {
    const includeInactive =
      query?.includeInactive === true ||
      query?.includeInactive === 'true' ||
      query?.includeInactive === '1' ||
      query?.all === true ||
      query?.all === 'true' ||
      query?.all === '1';

    const where: any = {};

    if (!includeInactive) {
      where.active = true;
    }

    if (query?.type && query.type.trim()) {
      where.type = {
        equals: query.type.trim(),
        mode: 'insensitive',
      };
    }

    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.resource.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { bookingResources: true },
        },
      },
    });
  }

  /**
   * Fetch a single resource by ID with historical booking count.
   */
  async getResourceById(id: number) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookingResources: true },
        },
      },
    });

    if (!resource) {
      throw new NotFoundException(`Resource #${id} not found`);
    }

    return resource;
  }

  /**
   * Create a new resource with duplicate prevention and audit logging.
   */
  async createResource(dto: CreateResourceDto, user?: any, ipAddress?: string) {
    const trimmedName = dto.name.trim();

    // Check for duplicate name (case-insensitive)
    const existing = await this.prisma.resource.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Resource with name '${trimmedName}' already exists`);
    }

    const created = await this.prisma.resource.create({
      data: {
        name: trimmedName,
        type: dto.type.trim().toUpperCase(),
        capacity: Number(dto.capacity),
        description: dto.description?.trim() || null,
        active: dto.active !== undefined ? Boolean(dto.active) : true,
      },
      include: {
        _count: {
          select: { bookingResources: true },
        },
      },
    });

    await this.auditService.logAction({
      action: 'RESOURCE_CREATED',
      entity: 'RESOURCE',
      entityId: created.id,
      entityKey: created.name,
      userId: user?.id,
      description: `Created resource '${created.name}' (${created.type}, capacity: ${created.capacity})`,
      newValue: created,
      ipAddress,
    });

    return created;
  }

  /**
   * Update an existing resource.
   * Enforces:
   * 1. Name uniqueness when renamed
   * 2. Positive capacity (min 1)
   * 3. Primary Capacity Protection (prevents deactivating the sole active capacity resource)
   * 4. Audit logging of state transitions (UPDATED, DEACTIVATED, ACTIVATED)
   */
  async updateResource(id: number, dto: UpdateResourceDto, user?: any, ipAddress?: string) {
    const existing = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookingResources: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Resource #${id} not found`);
    }

    // Name uniqueness check if renamed
    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const conflict = await this.prisma.resource.findFirst({
        where: {
          id: { not: id },
          name: { equals: dto.name.trim(), mode: 'insensitive' },
        },
      });

      if (conflict) {
        throw new ConflictException(`Resource with name '${dto.name.trim()}' already exists`);
      }
    }

    // Capacity validation
    if (dto.capacity !== undefined && Number(dto.capacity) < 1) {
      throw new BadRequestException('Resource capacity must be at least 1');
    }

    // Primary Capacity Protection:
    // If deactivating or changing type away from CAPACITY, ensure another active capacity resource exists
    const isPrimaryCapacity =
      existing.type === 'CAPACITY' ||
      existing.name.toLowerCase() === 'general day tourism';

    const isDeactivating = existing.active && dto.active === false;
    const isChangingTypeAwayFromCapacity =
      existing.type === 'CAPACITY' &&
      dto.type !== undefined &&
      dto.type.trim().toUpperCase() !== 'CAPACITY';

    if (isPrimaryCapacity && (isDeactivating || isChangingTypeAwayFromCapacity)) {
      const otherActiveCapacity = await this.prisma.resource.count({
        where: {
          id: { not: id },
          active: true,
          OR: [
            { type: 'CAPACITY' },
            { name: { equals: 'General Day Tourism', mode: 'insensitive' } },
          ],
        },
      });

      if (otherActiveCapacity === 0) {
        throw new BadRequestException(
          'Cannot deactivate or remove the CAPACITY type from the sole active primary capacity resource. Ensure an alternate active capacity resource exists first.',
        );
      }
    }

    const updated = await this.prisma.resource.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        type: dto.type !== undefined ? dto.type.trim().toUpperCase() : undefined,
        capacity: dto.capacity !== undefined ? Number(dto.capacity) : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        active: dto.active !== undefined ? Boolean(dto.active) : undefined,
      },
      include: {
        _count: {
          select: { bookingResources: true },
        },
      },
    });

    let action = 'RESOURCE_UPDATED';
    if (existing.active && updated.active === false) {
      action = 'RESOURCE_DEACTIVATED';
    } else if (!existing.active && updated.active === true) {
      action = 'RESOURCE_ACTIVATED';
    }

    await this.auditService.logAction({
      action,
      entity: 'RESOURCE',
      entityId: updated.id,
      entityKey: updated.name,
      userId: user?.id,
      description: `${action.replace('_', ' ')}: '${updated.name}' (capacity: ${existing.capacity} -> ${updated.capacity}, active: ${existing.active} -> ${updated.active})`,
      oldValue: existing,
      newValue: updated,
      ipAddress,
    });

    return updated;
  }

  /**
   * Delete or soft-deactivate a resource.
   * Enforces:
   * 1. Primary Capacity Protection (prevents deactivating/deleting sole active capacity resource)
   * 2. Historical Booking Integrity: If the resource has any BookingResource records,
   *    it MUST NOT be hard-deleted (which would violate FK or destroy audit history).
   *    Instead, it is safely soft-deactivated (active = false).
   * 3. RBAC: Only SUPER_ADMIN can permanently delete an unused resource; BOOKING_MANAGER
   *    is restricted to soft-deactivation.
   */
  async deleteResource(id: number, user?: any, ipAddress?: string) {
    const existing = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookingResources: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Resource #${id} not found`);
    }

    // Primary Capacity Protection
    const isPrimaryCapacity =
      existing.active &&
      (existing.type === 'CAPACITY' || existing.name.toLowerCase() === 'general day tourism');

    if (isPrimaryCapacity) {
      const otherActiveCapacity = await this.prisma.resource.count({
        where: {
          id: { not: id },
          active: true,
          OR: [
            { type: 'CAPACITY' },
            { name: { equals: 'General Day Tourism', mode: 'insensitive' } },
          ],
        },
      });

      if (otherActiveCapacity === 0) {
        throw new BadRequestException(
          'Cannot delete or deactivate the sole active primary capacity resource. Ensure an alternate active capacity resource exists first.',
        );
      }
    }

    const bookingCount = existing._count.bookingResources;

    // If historical bookings exist, soft-deactivate to preserve historical integrity
    if (bookingCount > 0) {
      const deactivated = await this.prisma.resource.update({
        where: { id },
        data: { active: false },
        include: {
          _count: {
            select: { bookingResources: true },
          },
        },
      });

      await this.auditService.logAction({
        action: 'RESOURCE_DEACTIVATED',
        entity: 'RESOURCE',
        entityId: deactivated.id,
        entityKey: deactivated.name,
        userId: user?.id,
        description: `Deactivated resource '${deactivated.name}' to preserve ${bookingCount} historical booking records`,
        oldValue: existing,
        newValue: deactivated,
        metadata: {
          reason: 'Preserve historical bookings',
          historicalBookingCount: bookingCount,
        },
        ipAddress,
      });

      return {
        success: true,
        deactivated: true,
        message: `Resource '${deactivated.name}' has ${bookingCount} historical booking records. It was safely deactivated to preserve historical integrity.`,
        resource: deactivated,
      };
    }

    // If no bookings exist, check RBAC: only SUPER_ADMIN can hard-delete
    if (user && user.role !== Role.SUPER_ADMIN) {
      const deactivated = await this.prisma.resource.update({
        where: { id },
        data: { active: false },
        include: {
          _count: {
            select: { bookingResources: true },
          },
        },
      });

      await this.auditService.logAction({
        action: 'RESOURCE_DEACTIVATED',
        entity: 'RESOURCE',
        entityId: deactivated.id,
        entityKey: deactivated.name,
        userId: user?.id,
        description: `Deactivated unused resource '${deactivated.name}' by ${user.role}`,
        oldValue: existing,
        newValue: deactivated,
        ipAddress,
      });

      return {
        success: true,
        deactivated: true,
        message: `Resource '${deactivated.name}' was deactivated by ${user.role}.`,
        resource: deactivated,
      };
    }

    // SUPER_ADMIN with 0 historical bookings: permanent deletion
    await this.prisma.resource.delete({ where: { id } });

    await this.auditService.logAction({
      action: 'RESOURCE_DELETED',
      entity: 'RESOURCE',
      entityId: existing.id,
      entityKey: existing.name,
      userId: user?.id,
      description: `Permanently deleted unused resource '${existing.name}'`,
      oldValue: existing,
      ipAddress,
    });

    return {
      success: true,
      deleted: true,
      message: `Resource '${existing.name}' was permanently deleted.`,
    };
  }
}
