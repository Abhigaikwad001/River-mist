import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Ip,
  ParseIntPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { GetResourcesQueryDto } from './dto/get-resources-query.dto';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  /**
   * List resources with optional search, type filter, and inactive inclusion.
   */
  @Get()
  getResources(@Query() query: GetResourcesQueryDto) {
    return this.resourcesService.getResources(query);
  }

  /**
   * Retrieve a single resource by ID with historical booking count.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Get(':id')
  getResourceById(@Param('id', ParseIntPipe) id: number) {
    return this.resourcesService.getResourceById(id);
  }

  /**
   * Create a new resource with validation and audit logging.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Post()
  createResource(
    @Body() dto: CreateResourceDto,
    @Request() req: any,
    @Ip() ipAddress: string,
  ) {
    return this.resourcesService.createResource(dto, req.user, ipAddress);
  }

  /**
   * Update a resource (name, type, capacity, description, active status).
   * Validates capacity >= 1, enforces primary capacity protection, and records audit logs.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Patch(':id')
  updateResource(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResourceDto,
    @Request() req: any,
    @Ip() ipAddress: string,
  ) {
    return this.resourcesService.updateResource(id, dto, req.user, ipAddress);
  }

  /**
   * Delete or soft-deactivate a resource.
   * If historical bookings exist, soft-deactivates to preserve BookingResource integrity.
   * If unused and caller is SUPER_ADMIN, permanently deletes.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Delete(':id')
  deleteResource(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Ip() ipAddress: string,
  ) {
    return this.resourcesService.deleteResource(id, req.user, ipAddress);
  }
}
