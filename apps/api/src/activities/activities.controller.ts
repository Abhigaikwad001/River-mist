import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, ValidationPipe, ParseIntPipe, Request } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  getActivities(
    @Query('activeOnly') activeOnly?: string,
    @Query('category') category?: string
  ) {
    const filters: any = {};
    if (activeOnly === 'true') filters.active = true;
    if (category) filters.category = category.toUpperCase();
    return this.activitiesService.getActivities(filters);
  }

  @Get(':id')
  getActivityById(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.getActivityById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.EVENT_MANAGER, Role.CONTENT_MANAGER, Role.FINANCE_MANAGER)
  @Post()
  createActivity(
    @Request() req: any,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) data: CreateActivityDto
  ) {
    return this.activitiesService.createActivity(data, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.EVENT_MANAGER, Role.CONTENT_MANAGER, Role.FINANCE_MANAGER)
  @Patch(':id')
  updateActivity(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) data: UpdateActivityDto
  ) {
    return this.activitiesService.updateActivity(id, data, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.EVENT_MANAGER, Role.CONTENT_MANAGER, Role.FINANCE_MANAGER)
  @Delete(':id')
  deleteActivity(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.deleteActivity(id, req.user?.id);
  }
}
