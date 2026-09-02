import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { FoodService } from './food.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('food')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get()
  getFood(@Query('activeOnly') activeOnly?: string) {
    const filters: any = {};
    if (activeOnly === 'true') filters.active = true;
    return this.foodService.getMenu(filters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Post()
  createMenuItem(@Body() data: any) {
    return this.foodService.createMenuItem(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Patch(':id')
  updateMenuItem(@Param('id') id: string, @Body() data: any) {
    return this.foodService.updateMenuItem(Number(id), data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id')
  deleteMenuItem(@Param('id') id: string) {
    return this.foodService.deleteMenuItem(Number(id));
  }
}
