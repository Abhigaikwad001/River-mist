import { Test, TestingModule } from '@nestjs/testing';
import { PackagesService } from './packages.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PackagesService', () => {
  let service: PackagesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    package: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PackagesService>(PackagesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPackages', () => {
    it('should return active packages and filter out expired seasonal packages', async () => {
      const mockPackages = [
        { id: 1, name: 'Regular Pkg', active: true, seasonalActive: false },
        { 
          id: 2, 
          name: 'Active Seasonal', 
          active: true, 
          seasonalActive: true, 
          validFrom: new Date('2025-01-01'), 
          validUntil: new Date('2099-12-31') 
        },
        { 
          id: 3, 
          name: 'Expired Seasonal', 
          active: true, 
          seasonalActive: true, 
          validFrom: new Date('2020-01-01'), 
          validUntil: new Date('2020-12-31') 
        },
      ];

      mockPrismaService.package.findMany.mockResolvedValue(mockPackages);

      const result = await service.getPackages(undefined, false, '2026-06-01');
      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toEqual([1, 2]);
    });

    it('should return all packages including inactive if all=true', async () => {
      const mockPackages = [
        { id: 1, name: 'Regular Pkg', active: true },
        { id: 2, name: 'Inactive Pkg', active: false },
      ];

      mockPrismaService.package.findMany.mockResolvedValue(mockPackages);

      const result = await service.getPackages(undefined, true);
      expect(result).toHaveLength(2);
    });
  });

  describe('createPackage & updatePackage', () => {
    it('should validate and reject negative adult prices', async () => {
      await expect(service.createPackage({ name: 'Test Pkg', priceAdult: -100, priceChild: 50 }))
        .rejects.toThrow(BadRequestException);
    });

    it('should validate and reject NaN adult prices', async () => {
      await expect(service.createPackage({ name: 'Test Pkg', priceAdult: 'invalid', priceChild: 50 }))
        .rejects.toThrow(BadRequestException);
    });

    it('should format inclusions string into an array', async () => {
      mockPrismaService.package.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const result = await service.createPackage({
        name: 'Standard Package',
        description: 'Test Desc',
        priceAdult: 1500,
        priceChild: 800,
        inclusions: 'Lunch, Swimming Pool, Rain Dance',
      });

      expect(mockPrismaService.package.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priceAdult: 1500,
          priceChild: 800,
          inclusions: ['Lunch', 'Swimming Pool', 'Rain Dance'],
        }),
      });
      expect(result.inclusions).toEqual(['Lunch', 'Swimming Pool', 'Rain Dance']);
    });

    it('should update package adult and child prices correctly in database', async () => {
      mockPrismaService.package.update.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const result = await service.updatePackage(1, {
        priceAdult: 1800,
        priceChild: 1000,
      });

      expect(mockPrismaService.package.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          priceAdult: 1800,
          priceChild: 1000,
        }),
      });
      expect(result.priceAdult).toBe(1800);
    });
  });
});
