import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let serviceMock: any;

  const sampleActivity = {
    id: 1,
    name: 'Archery Range',
    category: 'ADVENTURE',
    active: true,
  };

  beforeEach(async () => {
    serviceMock = {
      getActivities: jest.fn().mockResolvedValue([sampleActivity]),
      getActivityById: jest.fn().mockResolvedValue(sampleActivity),
      createActivity: jest.fn().mockResolvedValue(sampleActivity),
      updateActivity: jest.fn().mockResolvedValue(sampleActivity),
      deleteActivity: jest.fn().mockResolvedValue(sampleActivity),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get activities with activeOnly and category filters', async () => {
    const result = await controller.getActivities('true', 'adventure');
    expect(serviceMock.getActivities).toHaveBeenCalledWith({
      active: true,
      category: 'ADVENTURE',
    });
    expect(result).toEqual([sampleActivity]);
  });

  it('should get activity by ID', async () => {
    const result = await controller.getActivityById(1);
    expect(serviceMock.getActivityById).toHaveBeenCalledWith(1);
    expect(result).toEqual(sampleActivity);
  });

  it('should create an activity', async () => {
    const dto = { name: 'Archery Range', description: 'Fun shooting' };
    const result = await controller.createActivity(dto as any);
    expect(serviceMock.createActivity).toHaveBeenCalledWith(dto);
    expect(result).toEqual(sampleActivity);
  });
});
