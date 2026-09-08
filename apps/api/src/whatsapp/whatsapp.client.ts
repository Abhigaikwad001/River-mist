import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppMessagePayload, WhatsAppCloudApiResponse } from './whatsapp.types';

@Injectable()
export class WhatsAppClient {
  private readonly logger = new Logger(WhatsAppClient.name);
  private readonly registeredSecrets = new Set<string>();

  registerSecret(secret: string | undefined | null): void {
    if (secret && secret.trim().length > 3) {
      this.registeredSecrets.add(secret.trim());
    }
  }

  /**
   * Sanitizes any log string or error to guarantee tokens and secrets are never leaked.
   */
  sanitizeSecret(value: string | undefined | null): string {
    if (!value) return '';
    let sanitized = value.replace(/Bearer\s+[A-Za-z0-9\-_\.]+/gi, 'Bearer [REDACTED]');
    sanitized = sanitized.replace(/token\s+[A-Za-z0-9\-_\.]+/gi, 'token [REDACTED]');
    
    for (const secret of this.registeredSecrets) {
      sanitized = sanitized.split(secret).join('[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Dispatches a message payload to Meta's WhatsApp Cloud API.
   */
  async sendMessage(
    apiVersion: string,
    phoneNumberId: string,
    apiToken: string,
    payload: WhatsAppMessagePayload,
  ): Promise<WhatsAppCloudApiResponse> {
    if (apiToken) {
      this.registerSecret(apiToken);
    }
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
      type: payload.type,
      ...(payload.type === 'text' && payload.text ? { text: payload.text } : {}),
      ...(payload.type === 'template' && payload.template ? { template: payload.template } : {}),
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = (await response.json()) as WhatsAppCloudApiResponse;

      if (!response.ok || responseData.error) {
        const errMsg = responseData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        const errCode = responseData.error?.code ? ` (Code: ${responseData.error.code})` : '';
        this.logger.warn(`Meta Cloud API responded with error for ${payload.to}: ${errMsg}${errCode}`);
        throw new Error(`Meta WhatsApp Cloud API error: ${errMsg}${errCode}`);
      }

      return responseData;
    } catch (err: any) {
      const cleanMessage = this.sanitizeSecret(err.message || 'Unknown network error');
      this.logger.error(`Failed to send WhatsApp message to ${payload.to}: ${cleanMessage}`);
      throw new Error(cleanMessage);
    }
  }
}
