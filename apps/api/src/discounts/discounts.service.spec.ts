import { Test, TestingModule } from '@nestjs/testing';
import { DiscountsService } from './discounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DiscountsService', () => {
  let service: DiscountsService;
  let prisma: any;

  const mockDiscount = {
    id: 1,
    code: 'MONSOON20',
    name: 'Monsoon Special',
    description: '20% off on all day packages',
    type: 'PERCENTAGE',
    value: 20,
    active: true,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validUntil: new Date('2026-12-31T23:59:59Z'),
    usageLimit: 100,
    usageCount: 10,
    perCustomerLimit: 1,
    minBookingAmount: 1000,
    maxDiscountAmount: 1000,
    applicablePackages: [],
    applicableActivities: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuditService = {
    logAction: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    prisma = {
      discount: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      package: {
        findUnique: jest.fn(),
      },
      activity: {
        findMany: jest.fn(),
      },
      booking: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscountsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<DiscountsService>(DiscountsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDiscountCode', () => {
    it('should successfully calculate percentage discount within max cap', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        type: 'PERCENTAGE',
        value: 20, // 20% of 4000 = 800 (under 1000 max cap)
      });
      prisma.package.findUnique.mockResolvedValue({ id: 1, priceAdult: 2000, priceChild: 1000, slug: 'day-pass', name: 'Day Pass' });

      const res = await service.validateDiscountCode({
        code: 'MONSOON20',
        packageId: 1,
        activityIds: [],
        subtotal: 4000,
      });

      expect(res.eligible).toBe(true);
      expect(res.subtotal).toBe(4000);
      expect(res.discountAmount).toBe(800);
      expect(res.finalTotal).toBe(3200);
    });

    it('should cap percentage discount at maxDiscountAmount', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        type: 'PERCENTAGE',
        value: 50, // 50% of 6000 = 3000 -> capped at 1000
        maxDiscountAmount: 1000,
      });
      prisma.package.findUnique.mockResolvedValue({ id: 1, priceAdult: 3000, priceChild: 0, slug: 'day-pass', name: 'Day Pass' });

      const res = await service.validateDiscountCode({
        code: 'MONSOON20',
        packageId: 1,
        subtotal: 6000,
      });

      expect(res.eligible).toBe(true);
      expect(res.subtotal).toBe(6000);
      expect(res.discountAmount).toBe(1000);
      expect(res.finalTotal).toBe(5000);
    });

    it('should successfully apply FIXED_AMOUNT discount', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        type: 'FIXED_AMOUNT',
        value: 500,
      });
      prisma.package.findUnique.mockResolvedValue({ id: 1, priceAdult: 2000, priceChild: 0, slug: 'day-pass', name: 'Day Pass' });

      const res = await service.validateDiscountCode({
        code: 'MONSOON20',
        packageId: 1,
        subtotal: 4000,
      });

      expect(res.eligible).toBe(true);
      expect(res.subtotal).toBe(4000);
      expect(res.discountAmount).toBe(500);
      expect(res.finalTotal).toBe(3500);
    });

    it('should calculate ₹1 subtotal with percentage discount rounded down to 0', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        minBookingAmount: 0,
        type: 'PERCENTAGE',
        value: 20,
      });

      const res = await service.validateDiscountCode({
        code: 'MONSOON20',
        subtotal: 1,
      });

      expect(res.eligible).toBe(true);
      expect(res.discountAmount).toBe(0); // Math.floor(1 * 0.2) = 0
      expect(res.finalTotal).toBe(1);
    });

    it('should calculate ₹99 subtotal with 20% discount rounded down to 19', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        minBookingAmount: 0,
        type: 'PERCENTAGE',
        value: 20,
      });

      const res = await service.validateDiscountCode({
        code: 'MONSOON20',
        subtotal: 99,
      });

      expect(res.eligible).toBe(true);
      expect(res.discountAmount).toBe(19); // Math.floor(99 * 0.2) = 19
      expect(res.finalTotal).toBe(80);
    });

    it('should calculate ₹100 subtotal with 33% discount rounded down to 33', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        minBookingAmount: 0,
        type: 'PERCENTAGE',
        value: 33,
      });

      const res = await service.validateDiscountCode({
        code: 'MONSOON20',
        subtotal: 100,
      });

      expect(res.eligible).toBe(true);
      expect(res.discountAmount).toBe(33); // Math.floor(100 * 0.33) = 33
      expect(res.finalTotal).toBe(67);
    });


    it('should bound fixed discount equal to subtotal resulting in ₹0 final total', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        type: 'FIXED_AMOUNT',
        value: 4000,
      });

      const res = await service.validateDiscountCode({
        code: 'MONSOON20',
        subtotal: 4000,
      });

      expect(res.eligible).toBe(true);
      expect(res.discountAmount).toBe(4000);
      expect(res.finalTotal).toBe(0);
    });

    it('should bound fixed discount greater than subtotal resulting in ₹0 final total', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        type: 'FIXED_AMOUNT',
        value: 5000,
      });

      const res = await service.validateDiscountCode({
        code: 'MONSOON20',
        subtotal: 3000,
      });

      expect(res.eligible).toBe(true);
      expect(res.discountAmount).toBe(3000); // Capped at subtotal
      expect(res.finalTotal).toBe(0);
    });

    it('should reject invalid promo code with BadRequestException', async () => {
      prisma.discount.findUnique.mockResolvedValue(null);

      await expect(
        service.validateDiscountCode({
          code: 'INVALID_CODE',
          packageId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });


    it('should reject inactive promo code with BadRequestException', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        active: false,
      });

      await expect(
        service.validateDiscountCode({
          code: 'MONSOON20',
          packageId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject expired promo code', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        validUntil: new Date('2020-01-01T00:00:00Z'),
      });

      await expect(
        service.validateDiscountCode({
          code: 'MONSOON20',
          packageId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject code that has not started yet', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        validFrom: new Date('2030-01-01T00:00:00Z'),
      });

      await expect(
        service.validateDiscountCode({
          code: 'MONSOON20',
          packageId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject offer if global usage limit reached', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        usageLimit: 10,
        usageCount: 10,
      });

      await expect(
        service.validateDiscountCode({
          code: 'MONSOON20',
          packageId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject offer if minimum booking subtotal is not met', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        minBookingAmount: 5000,
      });
      prisma.package.findUnique.mockResolvedValue({ id: 1, priceAdult: 1000, priceChild: 0, slug: 'day-pass', name: 'Day Pass' });

      await expect(
        service.validateDiscountCode({
          code: 'MONSOON20',
          packageId: 1,
          subtotal: 2000, // subtotal = 2000 < 5000 min
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject offer if package is not in applicable list', async () => {
      prisma.discount.findUnique.mockResolvedValue({
        ...mockDiscount,
        applicablePackages: ['10', '11'], // Package 1 is not in list
      });
      prisma.package.findUnique.mockResolvedValue({ id: 1, priceAdult: 2000, priceChild: 0, slug: 'day-pass', name: 'Day Pass' });

      await expect(
        service.validateDiscountCode({
          code: 'MONSOON20',
          packageId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CRUD Operations', () => {
    it('should create a discount successfully', async () => {
      prisma.discount.findUnique.mockResolvedValue(null);
      prisma.discount.create.mockResolvedValue({ id: 1, code: 'NEW10', name: 'New 10%' });

      const result = await service.createDiscount({
        code: 'NEW10',
        name: 'New 10%',
        type: 'PERCENTAGE',
        value: 10,
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
      });

      expect(result.id).toBe(1);
      expect(prisma.discount.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException on duplicate code creation', async () => {
      prisma.discount.findUnique.mockResolvedValue(mockDiscount);

      await expect(
        service.createDiscount({
          code: 'MONSOON20',
          name: 'Duplicate',
          type: 'PERCENTAGE',
          value: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update a discount', async () => {
      prisma.discount.findUnique.mockResolvedValue(mockDiscount);
      prisma.discount.update.mockResolvedValue({ ...mockDiscount, name: 'Updated Name' });

      const result = await service.updateDiscount(1, { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    it('should delete a discount', async () => {
      prisma.discount.findUnique.mockResolvedValue(mockDiscount);
      prisma.discount.delete.mockResolvedValue(mockDiscount);

      const result = await service.deleteDiscount(1);
      expect(result.id).toBe(1);
    });
  });
});
