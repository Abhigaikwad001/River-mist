import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { Role } from '@prisma/client';

describe('ResourcesController (Phase 18F)', () => {
  let controller: ResourcesController;
  let service: ResourcesService;

  const mockService = {
    getResources: jest.fn(),
    getResourceById: jest.fn(),
    createResource: jest.fn(),
    updateResource: jest.fn(),
    deleteResource: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesController],
      providers: [
        {
          provide: ResourcesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ResourcesController>(ResourcesController);
    service = module.get<ResourcesService>(ResourcesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getResources with query dto', async () => {
    mockService.getResources.mockResolvedValue([{ id: 1, name: 'General' }]);
    const query = { includeInactive: 'true' };

    const result = await controller.getResources(query);

    expect(service.getResources).toHaveBeenCalledWith(query);
    expect(result).toHaveLength(1);
  });

  it('should call getResourceById with parsed id', async () => {
    mockService.getResourceById.mockResolvedValue({ id: 1, name: 'General' });

    const result = await controller.getResourceById(1);

    expect(service.getResourceById).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1, name: 'General' });
  });

  it('should call createResource passing user and ip', async () => {
    mockService.createResource.mockResolvedValue({ id: 10, name: 'Pavilion' });
    const dto = { name: 'Pavilion', type: 'VENUE', capacity: 100 };
    const req = { user: { id: 1, role: Role.SUPER_ADMIN } };

    const result = await controller.createResource(dto, req, '1.2.3.4');

    expect(service.createResource).toHaveBeenCalledWith(dto, req.user, '1.2.3.4');
    expect(result).toEqual({ id: 10, name: 'Pavilion' });
  });

  it('should call updateResource passing user and ip', async () => {
    mockService.updateResource.mockResolvedValue({ id: 10, capacity: 150 });
    const dto = { capacity: 150 };
    const req = { user: { id: 2, role: Role.BOOKING_MANAGER } };

    const result = await controller.updateResource(10, dto, req, '1.2.3.4');

    expect(service.updateResource).toHaveBeenCalledWith(10, dto, req.user, '1.2.3.4');
    expect(result).toEqual({ id: 10, capacity: 150 });
  });

  it('should call deleteResource passing user and ip', async () => {
    mockService.deleteResource.mockResolvedValue({ success: true, deactivated: true });
    const req = { user: { id: 2, role: Role.BOOKING_MANAGER } };

    const result = await controller.deleteResource(10, req, '1.2.3.4');

    expect(service.deleteResource).toHaveBeenCalledWith(10, req.user, '1.2.3.4');
    expect(result).toEqual({ success: true, deactivated: true });
  });
});
