import { Test, TestingModule } from '@nestjs/testing';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';

describe('PackagesController', () => {
  let controller: PackagesController;
  let service: PackagesService;

  const mockPackagesService = {
    getPackages: jest.fn(),
    getPackageById: jest.fn(),
    createPackage: jest.fn(),
    updatePackage: jest.fn(),
    deletePackage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackagesController],
      providers: [
        {
          provide: PackagesService,
          useValue: mockPackagesService,
        },
      ],
    }).compile();

    controller = module.get<PackagesController>(PackagesController);
    service = module.get<PackagesService>(PackagesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getPackages on service', async () => {
    mockPackagesService.getPackages.mockResolvedValue([]);
    await controller.getPackages();
    expect(mockPackagesService.getPackages).toHaveBeenCalledWith(undefined, false, undefined);
  });

  it('should call createPackage on service', async () => {
    const dto = {
      name: 'Day Tour',
      description: 'Full day fun',
      experienceType: 'DAY_TOURISM' as any,
      priceAdult: 1200,
      priceChild: 800,
      minGuests: 1,
    };
    mockPackagesService.createPackage.mockResolvedValue({ id: 1, ...dto });

    const result = await controller.createPackage(dto);
    expect(mockPackagesService.createPackage).toHaveBeenCalledWith(dto);
    expect(result.id).toBe(1);
  });
});
