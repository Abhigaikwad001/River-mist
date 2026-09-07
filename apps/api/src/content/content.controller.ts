import { Controller, Get, Post, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  getContent(@Query('category') category?: string) {
    return this.contentService.getContent(category);
  }

  @Get(':key')
  getContentByKey(@Param('key') key: string) {
    return this.contentService.getContentByKey(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Post()
  upsertContent(@Body() data: any) {
    return this.contentService.upsertContent(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Delete(':key')
  deleteContent(@Param('key') key: string) {
    return this.contentService.deleteContent(key);
  }
}
