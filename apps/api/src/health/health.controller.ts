import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Liveness probe (process is up)' })
  @Get()
  getLiveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @ApiOperation({ summary: 'Readiness probe (database connectivity check)' })
  @Get('ready')
  async getReadiness() {
    try {
      // Fast lightweight database ping
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new HttpException(
        {
          status: 'error',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
          message: 'Database check failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
