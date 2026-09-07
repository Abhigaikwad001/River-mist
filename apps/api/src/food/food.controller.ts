import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { FoodService } from './food.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('food')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get()
  getFood(
    @Query('category') category?: string,
    @Query('meal') meal?: string,
    @Query('isSeasonal') isSeasonal?: string,
    @Query('activeOnly') activeOnly?: string
  ) {
    const filters: any = {};
    if (category) filters.category = category;
    if (meal) filters.meal = meal;
    if (isSeasonal === 'true') filters.isSeasonal = true;
    if (activeOnly === 'true') filters.active = true;
    return this.foodService.getMenu(filters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Post()
  createMenuItem(@Body(new ValidationPipe({ whitelist: true, transform: true })) data: CreateMenuItemDto) {
    return this.foodService.createMenuItem(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Patch(':id')
  updateMenuItem(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) data: UpdateMenuItemDto
  ) {
    return this.foodService.updateMenuItem(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id')
  deleteMenuItem(@Param('id', ParseIntPipe) id: number) {
    return this.foodService.deleteMenuItem(id);
  }
}
