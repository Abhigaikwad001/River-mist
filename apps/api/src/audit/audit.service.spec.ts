import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAction', () => {
    it('should create an audit log record with sanitized data', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 1,
        action: 'UPDATE',
        entity: 'PACKAGE',
        entityId: 10,
        description: 'Updated package price',
        createdAt: new Date(),
      });

      await service.logAction({
        action: 'UPDATE',
        entity: 'PACKAGE',
        entityId: 10,
        userId: 1,
        description: 'Updated package price',
        oldValue: { priceAdult: 1000, password: 'secretpassword' },
        newValue: { priceAdult: 1200, razorpayKeySecret: 'topsecret' },
      });

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          action: 'UPDATE',
          entity: 'PACKAGE',
          entityId: 10,
          description: 'Updated package price',
          oldValue: JSON.stringify({ priceAdult: 1000, password: '[REDACTED]' }),
          newValue: JSON.stringify({ priceAdult: 1200, razorpayKeySecret: '[REDACTED]' }),
        }),
      });
    });

    it('should not throw if log creation fails silently in production', async () => {
      mockPrismaService.auditLog.create.mockRejectedValue(new Error('DB Error'));

      await expect(service.logAction({
        action: 'CREATE',
        entity: 'FOOD',
        description: 'Failed attempt',
      })).resolves.not.toThrow();
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit log entries and total count', async () => {
      const mockLogs = [
        { id: 1, action: 'CREATE', entity: 'PACKAGE', description: 'Created package' },
        { id: 2, action: 'UPDATE', entity: 'FOOD', description: 'Updated food item' },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(2);

      const result = await service.getAuditLogs({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockLogs,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should apply filters correctly', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({
        page: 2,
        limit: 5,
        entity: 'PACKAGE',
        action: 'PRICE_CHANGE',
        search: 'Adult',
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expect.objectContaining({
            entity: 'PACKAGE',
            action: 'PRICE_CHANGE',
            OR: [
              { description: { contains: 'Adult', mode: 'insensitive' } },
              { action: { contains: 'Adult', mode: 'insensitive' } },
              { entity: { contains: 'Adult', mode: 'insensitive' } },
              { entityKey: { contains: 'Adult', mode: 'insensitive' } },
              { user: { name: { contains: 'Adult', mode: 'insensitive' } } },
              { user: { email: { contains: 'Adult', mode: 'insensitive' } } },
            ],
          }),
        })
      );
    });
  });

  describe('getAuditLogById', () => {
    it('should return audit record if found', async () => {
      const mockLog = { id: 1, action: 'CREATE', entity: 'EVENT' };
      mockPrismaService.auditLog.findUnique.mockResolvedValue(mockLog);

      const result = await service.getAuditLogById(1);
      expect(result).toEqual(mockLog);
    });

    it('should throw NotFoundException if log does not exist', async () => {
      mockPrismaService.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.getAuditLogById(999)).rejects.toThrow(NotFoundException);
    });
  });
});
