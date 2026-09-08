import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { UpiPaymentQrService } from './qr/upi-payment-qr.service';

@Module({
  imports: [NotificationsModule, WhatsAppModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, UpiPaymentQrService],
  exports: [PaymentsService, UpiPaymentQrService]
})
export class PaymentsModule {}
