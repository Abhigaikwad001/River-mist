import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType } from '@prisma/client';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  async getPackages(type?: string, all?: boolean) {
    const where: any = {};
    if (!all) where.active = true;
    if (type) where.experienceType = type as EventType;
    
    return this.prisma.package.findMany({ 
      where,
      orderBy: { displayOrder: 'asc' }
    });
  }

  async getPackageById(id: number) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }
    return pkg;
  }

  async createPackage(data: any) {
    // Basic formatting
    if (data.priceAdult) data.priceAdult = Number(data.priceAdult);
    if (data.priceChild) data.priceChild = Number(data.priceChild);
    if (data.minGuests) data.minGuests = Number(data.minGuests);
    if (data.maxGuests) data.maxGuests = Number(data.maxGuests);
    if (data.displayOrder) data.displayOrder = Number(data.displayOrder);

    // auto generate slug if not provided
    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    return this.prisma.package.create({ data });
  }

  async updatePackage(id: number, data: any) {
    if (data.priceAdult) data.priceAdult = Number(data.priceAdult);
    if (data.priceChild) data.priceChild = Number(data.priceChild);
    if (data.minGuests) data.minGuests = Number(data.minGuests);
    if (data.maxGuests) data.maxGuests = Number(data.maxGuests);
    if (data.displayOrder) data.displayOrder = Number(data.displayOrder);

    return this.prisma.package.update({
      where: { id },
      data
    });
  }

  async deletePackage(id: number) {
    return this.prisma.package.delete({ where: { id } });
  }
}
