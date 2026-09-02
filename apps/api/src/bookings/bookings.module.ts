import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CapacityModule } from '../capacity/capacity.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CapacityModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService]
})
export class BookingsModule {}
