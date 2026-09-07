import { Test, TestingModule } from '@nestjs/testing';
import { FoodController } from './food.controller';
import { FoodService } from './food.service';

describe('FoodController', () => {
  let controller: FoodController;
  let serviceMock: any;

  const sampleMenuItem = {
    id: 1,
    name: 'Maharashtrian Thali',
    meal: 'LUNCH',
    category: 'THALI',
    active: true,
  };

  beforeEach(async () => {
    serviceMock = {
      getMenu: jest.fn().mockResolvedValue([sampleMenuItem]),
      createMenuItem: jest.fn().mockResolvedValue(sampleMenuItem),
      updateMenuItem: jest.fn().mockResolvedValue(sampleMenuItem),
      deleteMenuItem: jest.fn().mockResolvedValue(sampleMenuItem),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodController],
      providers: [
        {
          provide: FoodService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<FoodController>(FoodController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getMenu with appropriate filter parameters', async () => {
    const result = await controller.getFood('THALI', 'LUNCH', 'true', 'true');
    expect(serviceMock.getMenu).toHaveBeenCalledWith({
      category: 'THALI',
      meal: 'LUNCH',
      isSeasonal: true,
      active: true,
    });
    expect(result).toEqual([sampleMenuItem]);
  });

  it('should create a menu item', async () => {
    const dto = { name: 'New Thali' };
    const req = { user: { id: 1 } };
    const result = await controller.createMenuItem(req as any, dto as any);
    expect(serviceMock.createMenuItem).toHaveBeenCalledWith(dto, 1);
    expect(result).toEqual(sampleMenuItem);
  });

  it('should update a menu item', async () => {
    const dto = { name: 'Updated Thali' };
    const req = { user: { id: 1 } };
    const result = await controller.updateMenuItem(req as any, 1, dto as any);
    expect(serviceMock.updateMenuItem).toHaveBeenCalledWith(1, dto, 1);
    expect(result).toEqual(sampleMenuItem);
  });

  it('should delete a menu item', async () => {
    const req = { user: { id: 1 } };
    const result = await controller.deleteMenuItem(req as any, 1);
    expect(serviceMock.deleteMenuItem).toHaveBeenCalledWith(1, 1);
    expect(result).toEqual(sampleMenuItem);
  });
});
