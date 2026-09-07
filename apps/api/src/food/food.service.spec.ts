import { Test, TestingModule } from '@nestjs/testing';
import { FoodService } from './food.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FoodService', () => {
  let service: FoodService;
  let prismaMock: any;

  const sampleMenuItem = {
    id: 1,
    name: 'Maharashtrian Thali',
    description: 'Authentic regional thali',
    image: 'https://example.com/thali.jpg',
    meal: 'LUNCH',
    category: 'THALI',
    tags: ['Authentic', 'Local'],
    isVeg: true,
    isSeasonal: false,
    seasonalBadge: null,
    active: true,
    displayOrder: 1,
  };

  beforeEach(async () => {
    prismaMock = {
      menuItem: {
        findMany: jest.fn().mockResolvedValue([sampleMenuItem]),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(sampleMenuItem),
        update: jest.fn().mockResolvedValue(sampleMenuItem),
        delete: jest.fn().mockResolvedValue(sampleMenuItem),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<FoodService>(FoodService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return menu items matching filters', async () => {
    const result = await service.getMenu({ active: true });
    expect(prismaMock.menuItem.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { media: true },
    });
    expect(result).toEqual([sampleMenuItem]);
  });

  it('should create a menu item and parse tags if string', async () => {
    const dto = {
      name: 'Hurda Thali',
      tags: 'Seasonal, Rustic' as any,
      displayOrder: 2,
    };
    await service.createMenuItem(dto);
    expect(prismaMock.menuItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Hurda Thali',
        tags: ['Seasonal', 'Rustic'],
        displayOrder: 2,
      }),
    });
  });

  it('should throw BadRequestException if displayOrder is negative', async () => {
    const dto = {
      name: 'Invalid Item',
      displayOrder: -1,
    };
    await expect(service.createMenuItem(dto)).rejects.toThrow(BadRequestException);
  });

  it('should update an existing menu item', async () => {
    prismaMock.menuItem.findUnique.mockResolvedValue(sampleMenuItem);
    const dto = { name: 'Updated Thali' };
    const result = await service.updateMenuItem(1, dto);
    expect(prismaMock.menuItem.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ name: 'Updated Thali' }),
    });
    expect(result).toEqual(sampleMenuItem);
  });

  it('should throw NotFoundException on update if menu item does not exist', async () => {
    prismaMock.menuItem.findUnique.mockResolvedValue(null);
    await expect(service.updateMenuItem(99, { name: 'Test' })).rejects.toThrow(NotFoundException);
  });

  it('should delete an existing menu item', async () => {
    prismaMock.menuItem.findUnique.mockResolvedValue(sampleMenuItem);
    await service.deleteMenuItem(1);
    expect(prismaMock.menuItem.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should throw NotFoundException on delete if menu item does not exist', async () => {
    prismaMock.menuItem.findUnique.mockResolvedValue(null);
    await expect(service.deleteMenuItem(99)).rejects.toThrow(NotFoundException);
  });
});
