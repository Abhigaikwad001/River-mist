import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CapacityService } from '../capacity/capacity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly capacityService: CapacityService,
  ) {}

  @ApiOperation({ summary: 'Get calendar and capacity control center report (Admin)' })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-09-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-09-30' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER, Role.EVENT_MANAGER)
  @Get('calendar')
  getCalendar(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.capacityService.getCalendarReport(startDate, endDate);
  }

  @ApiOperation({ summary: 'Get comprehensive operational summary for River Mist Control Center' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER, Role.EVENT_MANAGER, Role.FINANCE_MANAGER, Role.CONTENT_MANAGER)
  @Get('dashboard/summary')
  getDashboardSummary(@Request() req: any) {
    return this.adminService.getDashboardSummary(req.user?.role);
  }

  @ApiOperation({ summary: 'Get legacy dashboard statistics' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER, Role.EVENT_MANAGER, Role.FINANCE_MANAGER)
  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @ApiOperation({ summary: 'Get historical revenue stream (Finance & Super Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_MANAGER)
  @Get('revenue')
  getRevenue() {
    return this.adminService.getRevenue();
  }
}
