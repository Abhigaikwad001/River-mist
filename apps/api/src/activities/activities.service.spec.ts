import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesService } from './activities.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let prismaMock: any;

  const sampleActivity = {
    id: 1,
    name: 'Archery Range',
    description: 'Test your aim',
    image: 'https://example.com/archery.jpg',
    price: 200,
    pricingType: 'PER_PERSON',
    capacity: 20,
    category: 'ADVENTURE',
    location: 'Adventure Zone',
    active: true,
    displayOrder: 1,
  };

  const mockAuditService = {
    logAction: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    prismaMock = {
      activity: {
        findMany: jest.fn().mockResolvedValue([sampleActivity]),
        findUnique: jest.fn().mockResolvedValue(sampleActivity),
        create: jest.fn().mockResolvedValue(sampleActivity),
        update: jest.fn().mockResolvedValue(sampleActivity),
        delete: jest.fn().mockResolvedValue(sampleActivity),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return activities matching filters', async () => {
    const result = await service.getActivities({ active: true, category: 'ADVENTURE' });
    expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
      where: { active: true, category: 'ADVENTURE' },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { media: true },
    });
    expect(result).toEqual([sampleActivity]);
  });

  it('should throw NotFoundException if activity does not exist on get', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);
    await expect(service.getActivityById(99)).rejects.toThrow(NotFoundException);
  });

  it('should create an activity successfully', async () => {
    const dto = {
      name: 'Zip Line',
      description: 'Fly high',
      price: 300,
      category: 'ADVENTURE',
    };
    await service.createActivity(dto as any);
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Zip Line', price: 300 }),
    });
  });

  it('should reject creation if price is negative', async () => {
    const dto = {
      name: 'Zip Line',
      description: 'Fly high',
      price: -100,
    };
    await expect(service.createActivity(dto as any)).rejects.toThrow(BadRequestException);
  });

  it('should update an activity successfully', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(sampleActivity);
    await service.updateActivity(1, { price: 250 });
    expect(prismaMock.activity.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ price: 250 }),
    });
  });
});
