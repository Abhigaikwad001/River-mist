import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppClient } from './whatsapp.client';
import { WhatsAppMessageBuilder } from './whatsapp-message.builder';
import { WhatsAppProvider } from './whatsapp.provider';
import { WhatsAppController } from './whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    WhatsAppClient,
    WhatsAppMessageBuilder,
    WhatsAppProvider,
  ],
  exports: [
    WhatsAppService,
    WhatsAppClient,
    WhatsAppMessageBuilder,
    WhatsAppProvider,
  ],
})
export class WhatsAppModule {}
