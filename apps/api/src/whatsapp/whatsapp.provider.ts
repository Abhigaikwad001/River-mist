import { Injectable, Logger } from '@nestjs/common';
import { INotificationProvider, SendNotificationDto } from '../notifications/providers/notification.provider.interface';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppTemplateType } from './whatsapp.types';

@Injectable()
export class WhatsAppProvider implements INotificationProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  getType(): 'EMAIL' | 'SMS' | 'WHATSAPP' {
    return 'WHATSAPP';
  }

  async send(dto: SendNotificationDto): Promise<boolean> {
    try {
      const result = await this.whatsAppService.dispatchNotification({
        recipientPhone: dto.recipient,
        type: WhatsAppTemplateType.BOOKING_REQUEST,
        context: {
          bookingNumber: dto.subject || 'RM-UPDATE',
          customerName: 'Valued Guest',
          packageName: 'River Mist',
          dateStr: new Date().toISOString().split('T')[0],
          headCountAdult: 1,
          headCountChild: 0,
          totalAmount: 0,
        },
        bookingId: dto.bookingId,
        quoteId: dto.quoteId,
      });

      return result.success;
    } catch (err: any) {
      this.logger.error(`WhatsAppProvider failed for ${dto.recipient}: ${err.message}`);
      return false;
    }
  }
}
