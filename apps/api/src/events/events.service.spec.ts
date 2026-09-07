import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EventsService', () => {
  let service: EventsService;
  let prismaMock: any;

  const sampleEvent = {
    id: 1,
    title: 'Winter Hurda Carnival',
    description: 'Fresh roasted Jowar festival',
    image: 'https://example.com/hurda.jpg',
    eventDate: new Date('2026-12-25'),
    startTime: '10:00',
    endTime: '18:00',
    location: 'Agro Farm Lawn',
    capacity: 200,
    price: 1500,
    status: 'PUBLISHED',
    active: true,
    displayOrder: 1,
  };

  beforeEach(async () => {
    prismaMock = {
      event: {
        findMany: jest.fn().mockResolvedValue([sampleEvent]),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(sampleEvent),
        update: jest.fn().mockResolvedValue(sampleEvent),
        delete: jest.fn().mockResolvedValue(sampleEvent),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return events matching activeOnly filter', async () => {
    const result = await service.getEvents({ active: true });
    expect(prismaMock.event.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: [{ displayOrder: 'asc' }, { eventDate: 'asc' }],
      include: { media: true },
    });
    expect(result).toEqual([sampleEvent]);
  });

  it('should throw NotFoundException if event not found', async () => {
    prismaMock.event.findUnique.mockResolvedValue(null);
    await expect(service.getEventById(99)).rejects.toThrow(NotFoundException);
  });

  it('should create an event successfully', async () => {
    const dto = {
      title: 'Monsoon Music Fest',
      description: 'Live acoustic night',
      eventDate: '2026-08-15',
      price: 500,
    };
    await service.createEvent(dto as any);
    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: 'Monsoon Music Fest', price: 500 }),
    });
  });

  it('should reject creation if price is negative', async () => {
    const dto = {
      title: 'Invalid Event',
      description: 'Test',
      eventDate: '2026-08-15',
      price: -500,
    };
    await expect(service.createEvent(dto as any)).rejects.toThrow(BadRequestException);
  });
});
