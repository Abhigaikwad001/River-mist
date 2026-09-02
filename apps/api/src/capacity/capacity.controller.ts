import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { CapacityService } from './capacity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('capacity')
@Controller('capacity')
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  @ApiOperation({ summary: 'Get availability by date (Admin / Internal)' })
  @ApiQuery({ name: 'date', required: true, example: '2026-08-27' })
  // We can open this up to regular users if they need to see availability, 
  // but the prompt says "Admin can see capacity...". 
  // For a booking flow, the frontend might also need a simplified check. 
  // For now, we'll expose it publicly or maybe just let anyone check availability.
  // The user prompt specifically mentions Admin. Let's make it public for frontend to check dates,
  // but it returns full details. Wait, "Admin can see: capacity, booked capacity...".
  // I will restrict it to BOOKING_MANAGER and SUPER_ADMIN.
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
}
