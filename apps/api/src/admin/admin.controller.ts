import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
