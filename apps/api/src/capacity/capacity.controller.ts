import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { CapacityService } from './capacity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SetDailyCapacityOverrideDto } from './dto/set-daily-capacity-override.dto';

@ApiTags('capacity')
@Controller('capacity')
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  @ApiOperation({ summary: 'Get availability by date (Admin / Internal)' })
  @ApiQuery({ name: 'date', required: true, example: '2026-08-27' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Get('availability')
  getAvailability(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('Date is required (YYYY-MM-DD)');
    }
    return this.capacityService.getAvailabilityReport(date);
  }

  @ApiOperation({ summary: 'List daily capacity overrides (Admin)' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-09-30' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Get('overrides')
  getOverrides(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.capacityService.getDailyOverrides(startDate, endDate);
  }

  @ApiOperation({ summary: 'Create or update daily capacity override / blackout date (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Post('overrides')
  setOverride(@Body() body: SetDailyCapacityOverrideDto, @Request() req: any) {
    return this.capacityService.setDailyOverride(body, req.user?.id);
  }

  @ApiOperation({ summary: 'Delete daily capacity override (Admin)' })
  @ApiParam({ name: 'id', required: true, example: 1 })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Delete('overrides/:id')
  deleteOverride(@Param('id') id: string, @Request() req: any) {
    return this.capacityService.deleteDailyOverride(Number(id), req.user?.id);
  }
}

