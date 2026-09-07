import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MediaService', () => {
  let service: MediaService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    media: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockAuditService = {
    logAction: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMedia', () => {
    it('should return media items with default sorting', async () => {
      const mockItems = [{ id: 1, title: 'Sample', category: 'GALLERY' }];
      mockPrismaService.media.findMany.mockResolvedValue(mockItems);

      const result = await service.getMedia();

      expect(prismaService.media.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: 'desc' }],
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
      expect(result).toEqual(mockItems);
    });

    it('should apply filters correctly', async () => {
      mockPrismaService.media.findMany.mockResolvedValue([]);

      await service.getMedia({
        category: 'FOOD',
        type: 'IMAGE',
        activeOnly: true,
        isFeatured: true,
        search: 'thali',
      });

      expect(prismaService.media.findMany).toHaveBeenCalledWith({
        where: {
          category: { equals: 'FOOD', mode: 'insensitive' },
          type: 'IMAGE',
          active: true,
          isFeatured: true,
          OR: [
            { title: { contains: 'thali', mode: 'insensitive' } },
            { altText: { contains: 'thali', mode: 'insensitive' } },
            { category: { contains: 'thali', mode: 'insensitive' } },
            { description: { contains: 'thali', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }],
        include: expect.any(Object),
      });
    });
  });

  describe('createMedia', () => {
    it('should create a media item', async () => {
      const dto = { url: 'https://example.com/img.jpg', title: 'Test Image', category: 'GALLERY' };
      const expectedResult = { id: 1, ...dto, active: true, isFeatured: false, displayOrder: 0 };
      mockPrismaService.media.create.mockResolvedValue(expectedResult);

      const result = await service.createMedia(dto);

      expect(prismaService.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: 'https://example.com/img.jpg',
          title: 'Test Image',
          category: 'GALLERY',
        }),
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException if URL is missing', async () => {
      await expect(service.createMedia({})).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateMedia', () => {
    it('should update media item', async () => {
      const existing = { id: 1, title: 'Old Title', category: 'GALLERY' };
      mockPrismaService.media.findUnique.mockResolvedValue(existing);
      mockPrismaService.media.update.mockResolvedValue({ ...existing, title: 'New Title' });

      const result = await service.updateMedia(1, { title: 'New Title' });

      expect(prismaService.media.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'New Title' },
      });
      expect(result.title).toBe('New Title');
    });

    it('should throw NotFoundException if media does not exist', async () => {
      mockPrismaService.media.findUnique.mockResolvedValue(null);
      await expect(service.updateMedia(999, { title: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMedia', () => {
    it('should delete existing media item', async () => {
      const existing = { id: 1, url: 'https://example.com/img.jpg' };
      mockPrismaService.media.findUnique.mockResolvedValue(existing);
      mockPrismaService.media.delete.mockResolvedValue(existing);

      const result = await service.deleteMedia(1);

      expect(prismaService.media.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(existing);
    });
  });

  describe('bulkOperation', () => {
    it('should handle ACTIVATE bulk action', async () => {
      mockPrismaService.media.updateMany.mockResolvedValue({ count: 2 });
      const result = await service.bulkOperation('ACTIVATE', [1, 2]);

      expect(prismaService.media.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { active: true },
      });
      expect(result).toEqual({ count: 2 });
    });

    it('should handle DEACTIVATE bulk action', async () => {
      mockPrismaService.media.updateMany.mockResolvedValue({ count: 2 });
      await service.bulkOperation('DEACTIVATE', [1, 2]);

      expect(prismaService.media.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { active: false },
      });
    });

    it('should handle CHANGE_CATEGORY bulk action', async () => {
      mockPrismaService.media.updateMany.mockResolvedValue({ count: 2 });
      await service.bulkOperation('CHANGE_CATEGORY', [1, 2], { category: 'FOOD' });

      expect(prismaService.media.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { category: 'FOOD' },
      });
    });

    it('should throw BadRequestException for empty ids list', async () => {
      await expect(service.bulkOperation('ACTIVATE', [])).rejects.toThrow(BadRequestException);
    });
  });
});
