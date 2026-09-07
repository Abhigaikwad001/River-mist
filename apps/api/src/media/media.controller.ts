import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { validateAndSaveFile, MulterFile } from './upload.util';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  getMedia(
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'displayOrder' | 'title' | 'category',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.mediaService.getMedia({
      category,
      type,
      activeOnly: activeOnly === 'true',
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  getMediaById(@Param('id') id: string) {
    return this.mediaService.getMediaById(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.EVENT_MANAGER)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @UploadedFile() file: any,
    @Body('category') category?: string,
    @Body('title') title?: string,
    @Body('altText') altText?: string,
    @Body('description') description?: string,
    @Body('isFeatured') isFeatured?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required for upload');
    }

    const savedFile = validateAndSaveFile(file);

    return this.mediaService.createMedia({
      type: savedFile.type,
      url: savedFile.urlPath,
      title: title || savedFile.originalName,
      altText: altText || savedFile.originalName,
      description: description || null,
      category: category || 'GALLERY',
      fileSize: savedFile.size,
      mimeType: savedFile.mimeType,
      active: true,
      isFeatured: isFeatured === 'true',
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.EVENT_MANAGER)
  @Post()
  createMedia(@Body() data: any) {
    return this.mediaService.createMedia(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.EVENT_MANAGER)
  @Post('bulk')
  bulkOperation(
    @Body('action') action: string,
    @Body('ids') ids: number[],
    @Body('payload') payload?: any,
  ) {
    return this.mediaService.bulkOperation(action, ids, payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER, Role.EVENT_MANAGER)
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
