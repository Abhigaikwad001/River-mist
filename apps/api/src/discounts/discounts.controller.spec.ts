import { Test, TestingModule } from '@nestjs/testing';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';

describe('DiscountsController', () => {
  let controller: DiscountsController;
  let service: DiscountsService;

  const mockDiscount = {
    id: 1,
    code: 'MONSOON20',
    name: 'Monsoon Special',
    type: 'PERCENTAGE',
    value: 20,
    active: true,
  };

  const mockDiscountsService = {
    createDiscount: jest.fn().mockResolvedValue(mockDiscount),
    getDiscounts: jest.fn().mockResolvedValue([mockDiscount]),
    getDiscountById: jest.fn().mockResolvedValue(mockDiscount),
    validateDiscountCode: jest.fn().mockResolvedValue({
      eligible: true,
      code: 'MONSOON20',
      name: 'Monsoon Special',
      type: 'PERCENTAGE',
      value: 20,
      discountAmount: 800,
      subtotal: 4000,
      finalTotal: 3200,
      message: 'Discount applied successfully',
    }),
    updateDiscount: jest.fn().mockResolvedValue({ ...mockDiscount, name: 'Updated Monsoon' }),
    deleteDiscount: jest.fn().mockResolvedValue(mockDiscount),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscountsController],
      providers: [
        {
          provide: DiscountsService,
          useValue: mockDiscountsService,
        },
      ],
    }).compile();

    controller = module.get<DiscountsController>(DiscountsController);
    service = module.get<DiscountsService>(DiscountsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.createDiscount on POST /discounts', async () => {
    const dto: any = {
      code: 'MONSOON20',
      name: 'Monsoon Special',
      type: 'PERCENTAGE',
      value: 20,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
    };
    const req = { user: { id: 1 } };
    const res = await controller.createDiscount(req as any, dto);
    expect(res).toEqual(mockDiscount);
    expect(service.createDiscount).toHaveBeenCalledWith(dto, 1);
  });

  it('should call service.getDiscounts on GET /discounts', async () => {
    const res = await controller.getDiscounts('true');
    expect(res).toEqual([mockDiscount]);
    expect(service.getDiscounts).toHaveBeenCalledWith(true);
  });

  it('should call service.validateDiscountCode on POST /discounts/validate', async () => {
    const dto: any = {
      code: 'MONSOON20',
      packageId: 1,
      headCountAdult: 2,
    };
    const req = { user: { id: 10 } };
    const res = await controller.validateDiscountPost(dto, req);
    expect(res.eligible).toBe(true);
    expect(res.discountAmount).toBe(800);
    expect(service.validateDiscountCode).toHaveBeenCalledWith(dto, 10);
  });

  it('should call service.getDiscountById on GET /discounts/:id', async () => {
    const res = await controller.getDiscountById('1');
    expect(res).toEqual(mockDiscount);
    expect(service.getDiscountById).toHaveBeenCalledWith(1);
  });

  it('should call service.updateDiscount on PATCH /discounts/:id', async () => {
    const dto: any = { name: 'Updated Monsoon' };
    const req = { user: { id: 1 } };
    const res = await controller.updateDiscount(req as any, '1', dto);
    expect(res.name).toBe('Updated Monsoon');
    expect(service.updateDiscount).toHaveBeenCalledWith(1, dto, 1);
  });

  it('should call service.deleteDiscount on DELETE /discounts/:id', async () => {
    const req = { user: { id: 1 } };
    const res = await controller.deleteDiscount(req as any, '1');
    expect(res).toEqual(mockDiscount);
    expect(service.deleteDiscount).toHaveBeenCalledWith(1, 1);
  });
});
