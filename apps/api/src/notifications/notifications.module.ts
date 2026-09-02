import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, EmailProvider, SmsProvider],
  exports: [NotificationsService]
})
export class NotificationsModule {}
