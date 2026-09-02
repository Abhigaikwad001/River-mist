import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  getMedia(@Query('category') category?: string, @Query('type') type?: string, @Query('activeOnly') activeOnly?: string) {
    const filters: any = {};
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (activeOnly === 'true') filters.active = true;
    return this.mediaService.getMedia(filters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Post()
  createMedia(@Body() data: any) {
    return this.mediaService.createMedia(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Patch(':id')
  updateMedia(@Param('id') id: string, @Body() data: any) {
    return this.mediaService.updateMedia(Number(id), data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Delete(':id')
  deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(Number(id));
  }
}
