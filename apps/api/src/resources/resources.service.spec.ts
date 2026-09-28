import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

describe('ResourcesService (Phase 18F Resources Management & Auditability)', () => {
  let service: ResourcesService;
  let mockPrisma: any;
  let mockAuditService: any;

  const mockAdminUser = {
    id: 1,
    email: 'admin@rivermist.com',
    role: Role.SUPER_ADMIN,
  };

  const mockBookingManager = {
    id: 2,
    email: 'manager@rivermist.com',
    role: Role.BOOKING_MANAGER,
  };

  beforeEach(async () => {
    mockAuditService = {
      logAction: jest.fn().mockResolvedValue({ id: 1 }),
    };

    mockPrisma = {
      resource: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
  });

  describe('getResources', () => {
    it('should return active resources by default with booking count', async () => {
      const activeResources = [
        { id: 1, name: 'General Day Tourism', type: 'CAPACITY', capacity: 500, active: true, _count: { bookingResources: 5 } },
        { id: 2, name: 'Wedding Lawn', type: 'VENUE', capacity: 1000, active: true, _count: { bookingResources: 2 } },
      ];
      mockPrisma.resource.findMany.mockResolvedValue(activeResources);

      const result = await service.getResources();

      expect(mockPrisma.resource.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { id: 'asc' },
        include: { _count: { select: { bookingResources: true } } },
      });
      expect(result).toEqual(activeResources);
    });

    it('should return all resources including inactive when includeInactive is true', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([]);

      await service.getResources({ includeInactive: 'true' });

      expect(mockPrisma.resource.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { id: 'asc' },
        include: { _count: { select: { bookingResources: true } } },
      });
    });

    it('should filter by type and search query if provided', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([]);

      await service.getResources({ type: 'VENUE', search: 'Lawn' });

      expect(mockPrisma.resource.findMany).toHaveBeenCalledWith({
        where: {
          active: true,
          type: { equals: 'VENUE', mode: 'insensitive' },
          OR: [
            { name: { contains: 'Lawn', mode: 'insensitive' } },
            { description: { contains: 'Lawn', mode: 'insensitive' } },
          ],
        },
        orderBy: { id: 'asc' },
        include: { _count: { select: { bookingResources: true } } },
      });
    });
  });

  describe('getResourceById', () => {
    it('should return single resource with booking count', async () => {
      const resource = {
        id: 1,
        name: 'General Day Tourism',
        type: 'CAPACITY',
        capacity: 500,
        active: true,
        _count: { bookingResources: 10 },
      };
      mockPrisma.resource.findUnique.mockResolvedValue(resource);

      const result = await service.getResourceById(1);

      expect(result).toEqual(resource);
      expect(mockPrisma.resource.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { _count: { select: { bookingResources: true } } },
      });
    });

    it('should throw NotFoundException if resource not found', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(null);

      await expect(service.getResourceById(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createResource', () => {
    it('should create resource and log audit action', async () => {
      mockPrisma.resource.findFirst.mockResolvedValue(null);
      const createdResource = {
        id: 10,
        name: 'Poolside Cabana',
        type: 'VENUE',
        capacity: 50,
        description: 'Luxury poolside cabanas',
        active: true,
        _count: { bookingResources: 0 },
      };
      mockPrisma.resource.create.mockResolvedValue(createdResource);

      const dto = {
        name: ' Poolside Cabana ',
        type: 'venue',
        capacity: 50,
        description: 'Luxury poolside cabanas',
        active: true,
      };

      const result = await service.createResource(dto, mockAdminUser, '127.0.0.1');

      expect(mockPrisma.resource.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: 'Poolside Cabana', mode: 'insensitive' } },
      });
      expect(mockPrisma.resource.create).toHaveBeenCalledWith({
        data: {
          name: 'Poolside Cabana',
          type: 'VENUE',
          capacity: 50,
          description: 'Luxury poolside cabanas',
          active: true,
        },
        include: { _count: { select: { bookingResources: true } } },
      });
      expect(mockAuditService.logAction).toHaveBeenCalledWith({
        action: 'RESOURCE_CREATED',
        entity: 'RESOURCE',
        entityId: 10,
        entityKey: 'Poolside Cabana',
        userId: 1,
        description: "Created resource 'Poolside Cabana' (VENUE, capacity: 50)",
        newValue: createdResource,
        ipAddress: '127.0.0.1',
      });
      expect(result).toEqual(createdResource);
    });

    it('should throw ConflictException if resource name already exists', async () => {
      mockPrisma.resource.findFirst.mockResolvedValue({ id: 1, name: 'General Day Tourism' });

      await expect(
        service.createResource(
          { name: 'general day tourism', type: 'CAPACITY', capacity: 500 },
          mockAdminUser,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateResource', () => {
    const existing = {
      id: 1,
      name: 'General Day Tourism',
      type: 'CAPACITY',
      capacity: 500,
      description: 'Day visitors',
      active: true,
      _count: { bookingResources: 20 },
    };

    it('should update capacity, description and write audit log', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(existing);
      const updated = { ...existing, capacity: 600, description: 'Updated description' };
      mockPrisma.resource.update.mockResolvedValue(updated);

      const result = await service.updateResource(
        1,
        { capacity: 600, description: 'Updated description' },
        mockAdminUser,
        '10.0.0.1',
      );

      expect(mockPrisma.resource.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: undefined,
          type: undefined,
          capacity: 600,
          description: 'Updated description',
          active: undefined,
        },
        include: { _count: { select: { bookingResources: true } } },
      });
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESOURCE_UPDATED',
          entity: 'RESOURCE',
          entityId: 1,
          userId: 1,
          ipAddress: '10.0.0.1',
        }),
      );
      expect(result).toEqual(updated);
    });

    it('should validate capacity >= 1', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(existing);

      await expect(
        service.updateResource(1, { capacity: 0 }, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate name when renaming', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(existing);
      mockPrisma.resource.findFirst.mockResolvedValue({ id: 2, name: 'Wedding Lawn' });

      await expect(
        service.updateResource(1, { name: 'Wedding Lawn' }, mockAdminUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should block deactivating sole active primary capacity resource', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(existing);
      // No other active capacity resource exists
      mockPrisma.resource.count.mockResolvedValue(0);

      await expect(
        service.updateResource(1, { active: false }, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow deactivating capacity resource if alternate active capacity resource exists', async () => {
      mockPrisma.resource.findUnique.mockResolvedValue(existing);
      // Alternate active capacity resource exists
      mockPrisma.resource.count.mockResolvedValue(1);
      const deactivated = { ...existing, active: false };
      mockPrisma.resource.update.mockResolvedValue(deactivated);

      const result = await service.updateResource(1, { active: false }, mockAdminUser);

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESOURCE_DEACTIVATED',
        }),
      );
      expect(result.active).toBe(false);
    });
  });

  describe('deleteResource (Historical Integrity & Safety)', () => {
    it('should soft-deactivate and NOT delete if resource has historical bookings', async () => {
      const resourceWithBookings = {
        id: 2,
        name: 'Wedding Lawn',
        type: 'VENUE',
        capacity: 1000,
        active: true,
        _count: { bookingResources: 15 },
      };
      mockPrisma.resource.findUnique.mockResolvedValue(resourceWithBookings);
      mockPrisma.resource.update.mockResolvedValue({ ...resourceWithBookings, active: false });

      const result = await service.deleteResource(2, mockAdminUser, '127.0.0.1');

      // Must NOT delete from DB
      expect(mockPrisma.resource.delete).not.toHaveBeenCalled();
      // Must soft-deactivate to preserve historical integrity
      expect(mockPrisma.resource.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { active: false },
        include: { _count: { select: { bookingResources: true } } },
      });
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESOURCE_DEACTIVATED',
          metadata: expect.objectContaining({
            historicalBookingCount: 15,
          }),
        }),
      );
      expect(result.deactivated).toBe(true);
      expect(result.message).toContain('15 historical booking records');
    });

    it('should block deleting sole active primary capacity resource even with 0 bookings', async () => {
      const soleCapacity = {
        id: 1,
        name: 'General Day Tourism',
        type: 'CAPACITY',
        capacity: 500,
        active: true,
        _count: { bookingResources: 0 },
      };
      mockPrisma.resource.findUnique.mockResolvedValue(soleCapacity);
      mockPrisma.resource.count.mockResolvedValue(0);

      await expect(
        service.deleteResource(1, mockAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should soft-deactivate instead of hard-delete if caller is BOOKING_MANAGER', async () => {
      const unusedResource = {
        id: 5,
        name: 'Unused Gazebo',
        type: 'VENUE',
        capacity: 20,
        active: true,
        _count: { bookingResources: 0 },
      };
      mockPrisma.resource.findUnique.mockResolvedValue(unusedResource);
      mockPrisma.resource.update.mockResolvedValue({ ...unusedResource, active: false });

      const result = await service.deleteResource(5, mockBookingManager);

      expect(mockPrisma.resource.delete).not.toHaveBeenCalled();
      expect(mockPrisma.resource.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { active: false },
        include: { _count: { select: { bookingResources: true } } },
      });
      expect(result.deactivated).toBe(true);
    });

    it('should permanently hard-delete if caller is SUPER_ADMIN and resource has 0 bookings', async () => {
      const unusedResource = {
        id: 5,
        name: 'Unused Gazebo',
        type: 'VENUE',
        capacity: 20,
        active: true,
        _count: { bookingResources: 0 },
      };
      mockPrisma.resource.findUnique.mockResolvedValue(unusedResource);
      mockPrisma.resource.delete.mockResolvedValue(unusedResource);

      const result = await service.deleteResource(5, mockAdminUser);

      expect(mockPrisma.resource.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESOURCE_DELETED',
          entityId: 5,
        }),
      );
      expect(result.deleted).toBe(true);
    });
  });
});
