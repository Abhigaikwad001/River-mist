import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({ summary: 'Get all settings (Public or authenticated)' })
  @Get()
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @ApiOperation({ summary: 'Update or create a setting (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @Post(':key')
  updateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
    @Body('type') type?: string,
    @Body('category') category?: string
  ) {
    return this.settingsService.updateSetting(key, value, type, category);
  }

  @ApiOperation({ summary: 'Delete a setting (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Delete(':key')
  deleteSetting(@Param('key') key: string) {
    return this.settingsService.deleteSetting(key);
  }
}
