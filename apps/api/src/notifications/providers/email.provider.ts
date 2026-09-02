import { Injectable, Logger } from '@nestjs/common';
import { INotificationProvider, SendNotificationDto } from './notification.provider.interface';

@Injectable()
export class EmailProvider implements INotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);

  getType(): 'EMAIL' | 'SMS' | 'WHATSAPP' {
    return 'EMAIL';
  }

  async send(dto: SendNotificationDto): Promise<boolean> {
    try {
      this.logger.log(`Sending EMAIL to ${dto.recipient}...`);
      this.logger.log(`Subject: ${dto.subject}`);
      
      // Mocking the email sending process
      // In production, this would use nodemailer, SendGrid, etc.
      // e.g. await transporter.sendMail(...)

      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      // Randomly simulate a failure for testing retries if we wanted to (omitted for stability)
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${dto.recipient}`, error);
      throw error;
    }
  }
}
