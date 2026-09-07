import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

describe('EventsController', () => {
  let controller: EventsController;
  let serviceMock: any;

  const sampleEvent = {
    id: 1,
    title: 'Winter Hurda Carnival',
    status: 'PUBLISHED',
    active: true,
  };

  beforeEach(async () => {
    serviceMock = {
      getEvents: jest.fn().mockResolvedValue([sampleEvent]),
      getEventById: jest.fn().mockResolvedValue(sampleEvent),
      createEvent: jest.fn().mockResolvedValue(sampleEvent),
      updateEvent: jest.fn().mockResolvedValue(sampleEvent),
      deleteEvent: jest.fn().mockResolvedValue(sampleEvent),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get events with activeOnly and status filters', async () => {
    const result = await controller.getEvents('true', 'published');
    expect(serviceMock.getEvents).toHaveBeenCalledWith({
      active: true,
      status: 'PUBLISHED',
    });
    expect(result).toEqual([sampleEvent]);
  });

  it('should get event by ID', async () => {
    const result = await controller.getEventById(1);
    expect(serviceMock.getEventById).toHaveBeenCalledWith(1);
    expect(result).toEqual(sampleEvent);
  });

  it('should create an event', async () => {
    const dto = { title: 'New Fest', description: 'Fun fest', eventDate: '2026-10-10' };
    const req = { user: { id: 1 } };
    const result = await controller.createEvent(req as any, dto as any);
    expect(serviceMock.createEvent).toHaveBeenCalledWith(dto, 1);
    expect(result).toEqual(sampleEvent);
  });
});
