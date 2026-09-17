import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { CapacityModule } from '../capacity/capacity.module';

@Module({
  imports: [PrismaModule, NotificationsModule, AuditModule, CapacityModule],
  providers: [QuotesService],
  controllers: [QuotesController]
})
export class QuotesModule {}

