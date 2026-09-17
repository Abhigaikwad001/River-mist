import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WhatsAppProvider } from '../whatsapp/whatsapp.provider';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailProvider, SmsProvider],
  exports: [NotificationsService]
})
export class NotificationsModule {}
