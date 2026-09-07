import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuditService } from './audit.service';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({ summary: 'Get paginated audit history logs (SUPER_ADMIN only)' })
  @Roles(Role.SUPER_ADMIN)
  @Get()
  getAuditLogs(@Query() query: GetAuditLogsQueryDto) {
    return this.auditService.getAuditLogs(query);
  }

  @ApiOperation({ summary: 'Get audit log details by ID (SUPER_ADMIN only)' })
  @Roles(Role.SUPER_ADMIN)
  @Get(':id')
  getAuditLogById(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.getAuditLogById(id);
  }
}
