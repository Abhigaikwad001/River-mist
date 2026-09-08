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

  /**
   * Uploads an in-memory buffer (such as dynamic QR PNG) directly to Meta Cloud API.
   * Eliminates ephemeral local disk dependencies on Render.
   */
  async uploadMedia(
    apiVersion: string,
    phoneNumberId: string,
    apiToken: string,
    fileBuffer: Buffer,
    mimeType: string = 'image/png',
    filename: string = 'payment-qr.png',
  ): Promise<{ id: string }> {
    if (apiToken) {
      this.registerSecret(apiToken);
    }
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`;

    try {
      const formData = new FormData();
      // Meta Graph API requires messaging_product to be specified for WhatsApp media
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', mimeType);

      if (typeof File !== 'undefined') {
        formData.append('file', new File([new Uint8Array(fileBuffer)], filename, { type: mimeType }));
      } else {
        formData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), filename);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: formData,
      });

      const responseData = (await response.json()) as any;

      if (!response.ok || !responseData.id) {
        const errObj = responseData.error || {};
        const errMsg = errObj.message || `HTTP ${response.status}: ${response.statusText}`;
        const errCode = errObj.code ? ` (Code: ${errObj.code})` : '';
        const errSubCode = errObj.error_subcode ? ` (Subcode: ${errObj.error_subcode})` : '';
        const errType = errObj.type ? ` [${errObj.type}]` : '';
        this.logger.error(`Meta Media Upload failed: ${errMsg}${errCode}${errSubCode}${errType}`);
        throw new Error(`Meta Media Upload error: ${errMsg}${errCode}${errSubCode}${errType}`);
      }

      return { id: responseData.id };
    } catch (err: any) {
      const cleanMessage = this.sanitizeSecret(err.message || 'Media upload error');
      this.logger.error(`Failed to upload media to Meta: ${cleanMessage}`);
      throw new Error(cleanMessage);
    }
  }

  /**
   * Dispatches an image message (using an uploaded Meta Media ID) with caption.
   */
  async sendImageMessage(
    apiVersion: string,
    phoneNumberId: string,
    apiToken: string,
    to: string,
    mediaId: string,
    caption?: string,
  ): Promise<WhatsAppCloudApiResponse> {
    if (apiToken) {
      this.registerSecret(apiToken);
    }
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Strict Meta safety: image captions must not exceed 1024 characters
    let safeCaption = caption;
    if (safeCaption && safeCaption.length > 1024) {
      this.logger.warn(`Image caption length (${safeCaption.length}) exceeds Meta 1024 limit; trimming safely.`);
      safeCaption = safeCaption.slice(0, 1020) + '...';
    }

    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        id: mediaId,
        ...(safeCaption ? { caption: safeCaption } : {}),
      },
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
        const errObj = (responseData as any).error || {};
        const errMsg = errObj.message || `HTTP ${response.status}: ${response.statusText}`;
        const errCode = errObj.code ? ` (Code: ${errObj.code})` : '';
        const errSubCode = errObj.error_subcode ? ` (Subcode: ${errObj.error_subcode})` : '';
        const errType = errObj.type ? ` [${errObj.type}]` : '';
        this.logger.error(`Meta Cloud API responded with error for image to ${to}: ${errMsg}${errCode}${errSubCode}${errType}`);
        throw new Error(`Meta WhatsApp Cloud API error: ${errMsg}${errCode}${errSubCode}${errType}`);
      }

      return responseData;
    } catch (err: any) {
      const cleanMessage = this.sanitizeSecret(err.message || 'Unknown network error');
      this.logger.error(`Failed to send WhatsApp image message to ${to}: ${cleanMessage}`);
      throw new Error(cleanMessage);
    }
  }
}
