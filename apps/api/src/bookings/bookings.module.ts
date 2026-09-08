import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CapacityModule } from '../capacity/capacity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [CapacityModule, NotificationsModule, PaymentsModule, WhatsAppModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
