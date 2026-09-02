import { Injectable, Logger } from '@nestjs/common';
import { INotificationProvider, SendNotificationDto } from './notification.provider.interface';

@Injectable()
export class SmsProvider implements INotificationProvider {
  private readonly logger = new Logger(SmsProvider.name);

  getType(): 'EMAIL' | 'SMS' | 'WHATSAPP' {
    return 'SMS';
  }

  async send(dto: SendNotificationDto): Promise<boolean> {
    try {
      this.logger.log(`Sending SMS to ${dto.recipient}...`);
      
      // Mocking the SMS sending process
      // In production, this would use Twilio, AWS SNS, Msg91, etc.
      await new Promise(resolve => setTimeout(resolve, 300)); 

      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${dto.recipient}`, error);
      throw error;
    }
  }
}
