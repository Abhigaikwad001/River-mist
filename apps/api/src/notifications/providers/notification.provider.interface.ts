export interface SendNotificationDto {
  recipient: string;
  subject?: string;
  content: string;
  bookingId?: number;
  quoteId?: number;
}

export interface INotificationProvider {
  send(dto: SendNotificationDto): Promise<boolean>;
  getType(): 'EMAIL' | 'SMS' | 'WHATSAPP';
}
