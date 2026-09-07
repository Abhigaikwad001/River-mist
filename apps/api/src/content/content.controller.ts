import { Controller, Get, Post, Delete, Param, Body, UseGuards, Query, Request } from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateSiteContentDto } from './dto/create-site-content.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  getContent(
    @Query('category') category?: string,
    @Query('all') all?: string,
  ) {
    const activeOnly = all !== 'true';
    return this.contentService.getContent(category, activeOnly);
  }

  @Get(':key')
  getContentByKey(@Param('key') key: string) {
    return this.contentService.getContentByKey(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Post()
  upsertContent(@Request() req: any, @Body() dto: CreateSiteContentDto) {
    return this.contentService.upsertContent(dto, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Delete(':key')
  deleteContent(@Request() req: any, @Param('key') key: string) {
    return this.contentService.deleteContent(key, req.user?.id);
  }
}
