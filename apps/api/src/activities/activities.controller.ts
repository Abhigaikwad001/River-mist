import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  getActivities(@Query('activeOnly') activeOnly?: string) {
    const filters: any = {};
    if (activeOnly === 'true') filters.active = true;
    return this.activitiesService.getActivities(filters);
  }

  @Get(':id')
  getActivityById(@Param('id') id: string) {
    return this.activitiesService.getActivityById(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.EVENT_MANAGER)
  @Post()
  createActivity(@Body() data: any) {
    return this.activitiesService.createActivity(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.EVENT_MANAGER)
  @Patch(':id')
  updateActivity(@Param('id') id: string, @Body() data: any) {
    return this.activitiesService.updateActivity(Number(id), data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.EVENT_MANAGER)
  @Delete(':id')
  deleteActivity(@Param('id') id: string) {
    return this.activitiesService.deleteActivity(Number(id));
  }
}
