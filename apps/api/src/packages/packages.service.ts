import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventType } from '@prisma/client';

@Injectable()
export class PackagesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getPackages(type?: string, all?: boolean, targetDate?: string) {
    const where: any = {};
    if (!all) where.active = true;
    if (type) where.experienceType = type as EventType;
    
    const packages = await this.prisma.package.findMany({ 
      where,
      orderBy: { displayOrder: 'asc' },
      include: { media: true }
    });

    if (all) {
      return packages;
    }

    // Filter seasonal availability for public catalog
    const checkDate = targetDate ? new Date(targetDate) : new Date();
    return packages.filter(pkg => {
      if (!pkg.seasonalActive) return true;
      if (pkg.validFrom && new Date(pkg.validFrom) > checkDate) return false;
      if (pkg.validUntil && new Date(pkg.validUntil) < checkDate) return false;
      return true;
    });
  }

  async getPackageById(id: number) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: { media: true }
    });
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }
    return pkg;
  }

  async createPackage(data: any, userId?: number) {
    if (data.priceAdult !== undefined) {
      data.priceAdult = Number(data.priceAdult);
      if (isNaN(data.priceAdult) || data.priceAdult < 0) {
        throw new BadRequestException('Adult price must be a non-negative number');
      }
    }

    if (data.priceChild !== undefined) {
      data.priceChild = Number(data.priceChild);
      if (isNaN(data.priceChild) || data.priceChild < 0) {
        throw new BadRequestException('Child price must be a non-negative number');
      }
    }

    if (data.minGuests !== undefined) data.minGuests = Number(data.minGuests);
    if (data.maxGuests !== undefined) data.maxGuests = data.maxGuests ? Number(data.maxGuests) : null;
    if (data.displayOrder !== undefined) data.displayOrder = Number(data.displayOrder);
    if (data.validFrom) data.validFrom = new Date(data.validFrom);
    if (data.validUntil) data.validUntil = new Date(data.validUntil);
    if (typeof data.inclusions === 'string') {
      try {
        data.inclusions = JSON.parse(data.inclusions);
      } catch (e) {
        data.inclusions = data.inclusions.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    const newPkg = await this.prisma.package.create({ data });

    await this.auditService.logAction({
      action: 'CREATE',
      entity: 'PACKAGE',
      entityId: newPkg.id,
      userId,
      description: `Created package "${newPkg.name}" (Adult: ₹${newPkg.priceAdult}, Child: ₹${newPkg.priceChild})`,
      newValue: {
        name: newPkg.name,
        priceAdult: newPkg.priceAdult,
        priceChild: newPkg.priceChild,
        experienceType: newPkg.experienceType,
        active: newPkg.active,
      },
    });

    return newPkg;
  }

  async updatePackage(id: number, data: any, userId?: number) {
    const oldPkg = await this.getPackageById(id);

    if (data.priceAdult !== undefined) {
      data.priceAdult = Number(data.priceAdult);
      if (isNaN(data.priceAdult) || data.priceAdult < 0) {
        throw new BadRequestException('Adult price must be a non-negative number');
      }
    }

    if (data.priceChild !== undefined) {
      data.priceChild = Number(data.priceChild);
      if (isNaN(data.priceChild) || data.priceChild < 0) {
        throw new BadRequestException('Child price must be a non-negative number');
      }
    }

    if (data.minGuests !== undefined) data.minGuests = Number(data.minGuests);
    if (data.maxGuests !== undefined) data.maxGuests = data.maxGuests ? Number(data.maxGuests) : null;
    if (data.displayOrder !== undefined) data.displayOrder = Number(data.displayOrder);
    if (data.validFrom !== undefined) data.validFrom = data.validFrom ? new Date(data.validFrom) : null;
    if (data.validUntil !== undefined) data.validUntil = data.validUntil ? new Date(data.validUntil) : null;
    if (typeof data.inclusions === 'string') {
      try {
        data.inclusions = JSON.parse(data.inclusions);
      } catch (e) {
        data.inclusions = data.inclusions.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const updatedPkg = await this.prisma.package.update({
      where: { id },
      data
    });

    const priceChanged = (data.priceAdult !== undefined && data.priceAdult !== oldPkg.priceAdult) ||
                        (data.priceChild !== undefined && data.priceChild !== oldPkg.priceChild);

    const action = priceChanged ? 'PRICE_CHANGE' : 'UPDATE';
    const description = priceChanged
      ? `Package "${updatedPkg.name}" price updated: Adult ₹${oldPkg.priceAdult} → ₹${updatedPkg.priceAdult}, Child ₹${oldPkg.priceChild} → ₹${updatedPkg.priceChild}`
      : `Updated package "${updatedPkg.name}"`;

    await this.auditService.logAction({
      action,
      entity: 'PACKAGE',
      entityId: updatedPkg.id,
      userId,
      description,
      oldValue: {
        name: oldPkg.name,
        priceAdult: oldPkg.priceAdult,
        priceChild: oldPkg.priceChild,
        active: oldPkg.active,
      },
      newValue: {
        name: updatedPkg.name,
        priceAdult: updatedPkg.priceAdult,
        priceChild: updatedPkg.priceChild,
        active: updatedPkg.active,
      },
    });

    return updatedPkg;
  }

  async deletePackage(id: number, userId?: number) {
    const oldPkg = await this.getPackageById(id);
    const deleted = await this.prisma.package.delete({ where: { id } });

    await this.auditService.logAction({
      action: 'DELETE',
      entity: 'PACKAGE',
      entityId: id,
      userId,
      description: `Deleted package "${oldPkg.name}"`,
      oldValue: {
        name: oldPkg.name,
        priceAdult: oldPkg.priceAdult,
        priceChild: oldPkg.priceChild,
      },
    });

    return deleted;
  }
}
