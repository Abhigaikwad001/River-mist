import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';

export type OfferStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper to derive dynamic offer status
   */
  public deriveOfferStatus(discount: any): OfferStatus {
    if (!discount.active) return 'DISABLED';
    const now = new Date();
    if (discount.validFrom && new Date(discount.validFrom) > now) return 'SCHEDULED';
    if (discount.validUntil && new Date(discount.validUntil) < now) return 'EXPIRED';
    if (discount.usageLimit !== null && discount.usageLimit !== undefined && discount.usageCount >= discount.usageLimit) return 'EXPIRED';
    return 'ACTIVE';
  }

  async getDiscounts(activeOnly?: boolean) {
    const where: any = {};
    if (activeOnly) where.active = true;

    const discounts = await this.prisma.discount.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return discounts.map(d => ({
      ...d,
      computedStatus: this.deriveOfferStatus(d)
    }));
  }

  async getDiscountById(id: number) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) {
      throw new NotFoundException(`Discount #${id} not found`);
    }
    return {
      ...discount,
      computedStatus: this.deriveOfferStatus(discount)
    };
  }

  /**
   * Server-authoritative discount validation endpoint
   */
  async validateDiscountCode(dto: ValidateDiscountDto, authUserId?: number) {
    if (!dto.code || dto.code.trim() === '') {
      throw new BadRequestException('Coupon code is required');
    }

    const normalizedCode = dto.code.trim().toUpperCase();
    const discount = await this.prisma.discount.findUnique({
      where: { code: normalizedCode }
    });

    if (!discount || !discount.active) {
      throw new BadRequestException('Invalid or inactive discount code');
    }

    const now = new Date();
    if (discount.validFrom && new Date(discount.validFrom) > now) {
      throw new BadRequestException('Offer is not yet active');
    }
    if (discount.validUntil && new Date(discount.validUntil) < now) {
      throw new BadRequestException('Offer has expired');
    }
    if (discount.usageLimit !== null && discount.usageLimit !== undefined && discount.usageCount >= discount.usageLimit) {
      throw new BadRequestException('Offer usage limit reached');
    }

    // Customer usage limit check
    if (discount.perCustomerLimit && discount.perCustomerLimit > 0) {
      let customerBookingCount = 0;
      if (authUserId) {
        customerBookingCount = await this.prisma.booking.count({
          where: { userId: authUserId, discountId: discount.id }
        });
      } else if (dto.guestEmail) {
        customerBookingCount = await this.prisma.booking.count({
          where: {
            user: { email: dto.guestEmail },
            discountId: discount.id
          }
        });
      }
      if (customerBookingCount >= discount.perCustomerLimit) {
        throw new BadRequestException(`You have already used offer '${normalizedCode}' the maximum allowed times (${discount.perCustomerLimit})`);
      }
    }

    // Calculate subtotal if packageId is provided or passed in DTO
    let subtotal = dto.subtotal || 0;
    if (dto.packageId) {
      const pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId } });
      if (!pkg) {
        throw new BadRequestException('Selected package not found');
      }
      
      // Applicable packages check
      if (Array.isArray(discount.applicablePackages) && discount.applicablePackages.length > 0) {
        const pkgMatch = discount.applicablePackages.some(
          p => p === String(pkg.id) || p.toLowerCase() === pkg.slug.toLowerCase()
        );
        if (!pkgMatch) {
          throw new BadRequestException(`Offer '${normalizedCode}' is not applicable to package '${pkg.name}'`);
        }
      }

      if (!dto.subtotal) {
        subtotal = pkg.priceAdult; // Fallback estimate
      }
    }

    // Applicable activities check
    if (dto.activityIds && dto.activityIds.length > 0 && Array.isArray(discount.applicableActivities) && discount.applicableActivities.length > 0) {
      const activityMatch = dto.activityIds.some(
        actId => discount.applicableActivities.includes(String(actId))
      );
      if (!activityMatch) {
        throw new BadRequestException(`Offer '${normalizedCode}' is not applicable to selected activities`);
      }
    }

    // Minimum booking subtotal check
    if (discount.minBookingAmount && discount.minBookingAmount > 0 && subtotal > 0) {
      if (subtotal < discount.minBookingAmount) {
        throw new BadRequestException(
          `Offer '${normalizedCode}' requires a minimum subtotal of ₹${discount.minBookingAmount.toLocaleString('en-IN')}`
        );
      }
    }

    // Calculate discount amount safely
    let discountAmount = 0;
    const typeUpper = discount.type.toUpperCase();

    if (typeUpper === 'PERCENTAGE') {
      discountAmount = Math.floor(subtotal * (discount.value / 100));
      if (discount.maxDiscountAmount && discount.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
      }
    } else if (typeUpper === 'FIXED_AMOUNT' || typeUpper === 'FIXED') {
      discountAmount = discount.value;
    }

    discountAmount = Math.min(discountAmount, subtotal);
    const finalTotal = Math.max(0, subtotal - discountAmount);

    return {
      eligible: true,
      code: discount.code,
      name: discount.name || discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount,
      subtotal,
      finalTotal,
      message: `Offer '${discount.code}' applied successfully!`,
      discountId: discount.id,
    };
  }

  async createDiscount(dto: CreateDiscountDto) {
    const codeNormalized = dto.code.trim().toUpperCase();

    const existing = await this.prisma.discount.findUnique({ where: { code: codeNormalized } });
    if (existing) {
      throw new BadRequestException(`Discount code '${codeNormalized}' already exists`);
    }

    const typeUpper = dto.type.toUpperCase();
    if (typeUpper === 'PERCENTAGE' && (dto.value <= 0 || dto.value > 100)) {
      throw new BadRequestException('Percentage discount value must be between 1 and 100');
    }

    return this.prisma.discount.create({
      data: {
        code: codeNormalized,
        name: dto.name || codeNormalized,
        description: dto.description || null,
        type: typeUpper,
        value: Number(dto.value),
        minBookingAmount: dto.minBookingAmount ? Number(dto.minBookingAmount) : 0,
        maxDiscountAmount: dto.maxDiscountAmount ? Number(dto.maxDiscountAmount) : null,
        perCustomerLimit: dto.perCustomerLimit ? Number(dto.perCustomerLimit) : 1,
        applicablePackages: Array.isArray(dto.applicablePackages) ? dto.applicablePackages : [],
        applicableActivities: Array.isArray(dto.applicableActivities) ? dto.applicableActivities : [],
        active: dto.active !== undefined ? Boolean(dto.active) : true,
        usageLimit: dto.usageLimit ? Number(dto.usageLimit) : null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        displayOrder: dto.displayOrder ? Number(dto.displayOrder) : 0,
      },
    });
  }

  async updateDiscount(id: number, dto: UpdateDiscountDto) {
    await this.getDiscountById(id);

    const updateData: any = {};
    if (dto.code) updateData.code = dto.code.trim().toUpperCase();
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type) updateData.type = dto.type.toUpperCase();
    if (dto.value !== undefined) updateData.value = Number(dto.value);
    if (dto.minBookingAmount !== undefined) updateData.minBookingAmount = Number(dto.minBookingAmount);
    if (dto.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = dto.maxDiscountAmount ? Number(dto.maxDiscountAmount) : null;
    if (dto.perCustomerLimit !== undefined) updateData.perCustomerLimit = dto.perCustomerLimit ? Number(dto.perCustomerLimit) : null;
    if (dto.applicablePackages !== undefined) updateData.applicablePackages = Array.isArray(dto.applicablePackages) ? dto.applicablePackages : [];
    if (dto.applicableActivities !== undefined) updateData.applicableActivities = Array.isArray(dto.applicableActivities) ? dto.applicableActivities : [];
    if (dto.active !== undefined) updateData.active = Boolean(dto.active);
    if (dto.usageLimit !== undefined) updateData.usageLimit = dto.usageLimit ? Number(dto.usageLimit) : null;
    if (dto.validFrom !== undefined) updateData.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validUntil !== undefined) updateData.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.displayOrder !== undefined) updateData.displayOrder = Number(dto.displayOrder);

    if (updateData.type === 'PERCENTAGE' && updateData.value !== undefined) {
      if (updateData.value <= 0 || updateData.value > 100) {
        throw new BadRequestException('Percentage discount value must be between 1 and 100');
      }
    }

    return this.prisma.discount.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteDiscount(id: number) {
    await this.getDiscountById(id);
    return this.prisma.discount.delete({ where: { id } });
  }
}
