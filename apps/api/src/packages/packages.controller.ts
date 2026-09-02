import { Controller, Get, Query, Param, Post, Body, Patch, Delete, UseGuards, BadRequestException } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, EventType } from '@prisma/client';

@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  getPackages(@Query('type') type?: string, @Query('all') all?: string) {
    if (type && !Object.values(EventType).includes(type as EventType)) {
      throw new BadRequestException(`Invalid event type: ${type}`);
    }
    return this.packagesService.getPackages(type, all === 'true');
  }

  @Get(':id')
  getPackageById(@Param('id') id: string) {
    return this.packagesService.getPackageById(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.EVENT_MANAGER, Role.BOOKING_MANAGER)
  @Post()
  createPackage(@Body() data: any) {
    return this.packagesService.createPackage(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.EVENT_MANAGER, Role.BOOKING_MANAGER)
  @Patch(':id')
  updatePackage(@Param('id') id: string, @Body() data: any) {
    return this.packagesService.updatePackage(Number(id), data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.EVENT_MANAGER, Role.BOOKING_MANAGER)
  @Delete(':id')
  deletePackage(@Param('id') id: string) {
    return this.packagesService.deletePackage(Number(id));
  }
}
