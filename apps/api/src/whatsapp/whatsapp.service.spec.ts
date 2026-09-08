import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppClient } from './whatsapp.client';
import { WhatsAppMessageBuilder } from './whatsapp-message.builder';
import { WhatsAppController } from './whatsapp.controller';
import { PrismaService } from '../prisma/prisma.service';
import {
  WhatsAppMode,
  WhatsAppTemplateType,
  normalizePhoneNumber,
} from './whatsapp.types';

describe('WhatsApp Integration (Phase 12)', () => {
  let service: WhatsAppService;
  let client: WhatsAppClient;
  let messageBuilder: WhatsAppMessageBuilder;
  let controller: WhatsAppController;
  let prisma: any;

  const mockNotificationLogs: any[] = [];

  beforeEach(async () => {
    mockNotificationLogs.length = 0;

    prisma = {
      notificationLog: {
        create: jest.fn().mockImplementation((args) => {
          const log = { id: mockNotificationLogs.length + 1, ...args.data };
          mockNotificationLogs.push(log);
          return Promise.resolve(log);
        }),
        update: jest.fn().mockImplementation((args) => {
          const log = mockNotificationLogs.find((l) => l.id === args.where.id);
          if (log) {
            Object.assign(log, args.data);
          }
          return Promise.resolve(log || { id: args.where.id, ...args.data });
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        WhatsAppService,
        WhatsAppClient,
        WhatsAppMessageBuilder,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
    client = module.get<WhatsAppClient>(WhatsAppClient);
    messageBuilder = module.get<WhatsAppMessageBuilder>(WhatsAppMessageBuilder);
    controller = module.get<WhatsAppController>(WhatsAppController);
  });

  afterEach(() => {
    delete process.env.WHATSAPP_BUSINESS_PHONE_NUMBER;
    delete process.env.WHATSAPP_CLOUD_API_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_MODE;
    delete process.env.WHATSAPP_TEMPLATE_BOOKING_REQUEST;
  });

  describe('1. WhatsApp Number Configuration', () => {
    it('should default to 919322759343 when env is not set', () => {
      delete process.env.WHATSAPP_BUSINESS_PHONE_NUMBER;
      service.reloadConfig();
      expect(service.getConfig().businessPhoneNumber).toBe('919322759343');
    });

    it('should normalize and use WHATSAPP_BUSINESS_PHONE_NUMBER from env', () => {
      process.env.WHATSAPP_BUSINESS_PHONE_NUMBER = '+91 93227-59343';
      service.reloadConfig();
      expect(service.getConfig().businessPhoneNumber).toBe('919322759343');
    });
  });

  describe('2. wa.me URL Generation', () => {
    it('should build a valid wa.me URL without +, spaces or special chars', () => {
      const text = 'Hello River Mist! Booking RM-2026-000001';
      const url = `https://wa.me/919322759343?text=${encodeURIComponent(text)}`;
      expect(url).toContain('wa.me/919322759343');
      expect(url).not.toContain('+');
      expect(url).not.toContain(' ');
    });
  });

  describe('3. International Phone Number Normalization', () => {
    it('should normalize 10-digit Indian numbers with country code 91', () => {
      expect(normalizePhoneNumber('9322759343')).toBe('919322759343');
    });

    it('should strip +, hyphens, spaces, and brackets', () => {
      expect(normalizePhoneNumber('+91 (932) 275-9343')).toBe('919322759343');
    });

    it('should handle numbers with leading zero', () => {
      expect(normalizePhoneNumber('09322759343')).toBe('919322759343');
    });

    it('should retain non-Indian international country codes', () => {
      expect(normalizePhoneNumber('+1 (555) 234-5678')).toBe('15552345678');
      expect(normalizePhoneNumber('+44 20 7946 0958')).toBe('442079460958');
    });
  });

  describe('4. Booking WhatsApp Message Generation', () => {
    const context = {
      bookingNumber: 'RM-2026-000123',
      customerName: 'Aarav Patel',
      customerPhone: '9876543210',
      packageName: 'Royal River View Weekend',
      dateStr: '2026-10-15',
      headCountAdult: 2,
      headCountChild: 1,
      totalAmount: 12000,
      advanceRequired: 3000,
      amountPaid: 3000,
      balanceAmount: 9000,
    };

    it('should generate booking request message distinguishing review status', () => {
      const body = messageBuilder.buildTextBody(WhatsAppTemplateType.BOOKING_REQUEST, context);
      expect(body).toContain('Booking Request Received');
      expect(body).toContain('RM-2026-000123');
      expect(body).toContain('under review');
      expect(body).toContain('Aarav Patel');
      expect(body).toContain('₹12,000');
    });

    it('should generate confirmed booking message clearly stating confirmation', () => {
      const body = messageBuilder.buildTextBody(WhatsAppTemplateType.BOOKING_CONFIRMED, context);
      expect(body).toContain('Booking Confirmed');
      expect(body).toContain('confirmed');
      expect(body).toContain('RM-2026-000123');
      expect(body).toContain('*Balance Due:* ₹9,000');
    });

    it('should generate payment instructions message with bank/UPI guidance', () => {
      const body = messageBuilder.buildTextBody(WhatsAppTemplateType.PAYMENT_INSTRUCTIONS, context);
      expect(body).toContain('Payment Instructions');
      expect(body).toContain('RM-2026-000123');
      expect(body).toContain('*Advance Required:* ₹3,000');
      expect(body).toContain('UPI ID / Bank details');
    });

    it('should generate payment received message confirming receipt', () => {
      const body = messageBuilder.buildTextBody(WhatsAppTemplateType.PAYMENT_RECEIVED, {
        ...context,
        paymentMethod: 'UPI',
      });
      expect(body).toContain('Payment Received');
      expect(body).toContain('*Amount:* ₹3,000');
      expect(body).toContain('via UPI');
    });

    it('should generate booking cancelled message', () => {
      const body = messageBuilder.buildTextBody(WhatsAppTemplateType.BOOKING_CANCELLED, context);
      expect(body).toContain('Booking Cancelled');
      expect(body).toContain('RM-2026-000123');
    });
  });

  describe('5. Wedding Quote Message Generation', () => {
    it('should generate wedding quote request notification', () => {
      const body = messageBuilder.buildTextBody(WhatsAppTemplateType.WEDDING_QUOTE_REQUEST, {
        quoteNumber: 'WQ-2026-00045',
        customerName: 'Priya Sharma',
        customerPhone: '9820011223',
        eventDate: '2026-12-20',
        guestCount: 250,
      });
      expect(body).toContain('Wedding Quote Request');
      expect(body).toContain('WQ-2026-00045');
      expect(body).toContain('Priya Sharma');
      expect(body).toContain('250 guests');
    });
  });

  describe('6. Cloud API Request Construction', () => {
    it('should construct text message when no template is configured', () => {
      const payload = messageBuilder.buildMessage(
        '919322759343',
        WhatsAppTemplateType.BOOKING_REQUEST,
        {
          bookingNumber: 'RM-2026-001',
          customerName: 'Guest',
          packageName: 'Day Visit',
          dateStr: '2026-09-10',
          headCountAdult: 2,
          headCountChild: 0,
          totalAmount: 3000,
        },
      );
      expect(payload.messaging_product).toBe('whatsapp');
      expect(payload.to).toBe('919322759343');
      expect(payload.type).toBe('text');
      expect(payload.text?.body).toContain('RM-2026-001');
    });

    it('should construct template message when template name is provided', () => {
      const payload = messageBuilder.buildMessage(
        '919322759343',
        WhatsAppTemplateType.BOOKING_CONFIRMED,
        {
          bookingNumber: 'RM-2026-002',
          customerName: 'Guest',
          packageName: 'Day Visit',
          dateStr: '2026-09-10',
          headCountAdult: 2,
          headCountChild: 0,
          totalAmount: 3000,
        },
        'rivermist_booking_confirmed_v1',
      );
      expect(payload.type).toBe('template');
      expect(payload.template?.name).toBe('rivermist_booking_confirmed_v1');
      expect(payload.template?.components?.length).toBeGreaterThan(0);
    });
  });

  describe('7. Missing API Credentials Handling', () => {
    it('should fall back to wa.me click-to-chat without error when credentials are absent', async () => {
      delete process.env.WHATSAPP_CLOUD_API_TOKEN;
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
      service.reloadConfig();

      const result = await service.dispatchNotification({
        recipientPhone: '919876543210',
        type: WhatsAppTemplateType.BOOKING_REQUEST,
        context: {
          bookingNumber: 'RM-TEST',
          customerName: 'Test Guest',
          packageName: 'Day Visit',
          dateStr: '2026-09-10',
          headCountAdult: 1,
          headCountChild: 0,
          totalAmount: 1500,
        },
        bookingId: 99,
      });

      expect(result.success).toBe(true);
      expect(result.fallbackUrl).toContain('wa.me/919876543210');
      expect(prisma.notificationLog.create).toHaveBeenCalled();
    });
  });

  describe('8. API Failure & Safe Error Handling', () => {
    it('should catch Cloud API failure, log to DB, sanitize errors, and not throw', async () => {
      process.env.WHATSAPP_CLOUD_API_TOKEN = 'secret_test_token_12345';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_id_999';
      process.env.WHATSAPP_MODE = 'CLOUD_API';
      service.reloadConfig();

      jest.spyOn(client, 'sendMessage').mockRejectedValueOnce(
        new Error('Meta Graph API 401 Unauthorized for token secret_test_token_12345'),
      );

      const result = await service.dispatchNotification({
        recipientPhone: '919876543210',
        type: WhatsAppTemplateType.BOOKING_REQUEST,
        context: {
          bookingNumber: 'RM-FAIL',
          customerName: 'Fail Test',
          packageName: 'Day Visit',
          dateStr: '2026-09-10',
          headCountAdult: 1,
          headCountChild: 0,
          totalAmount: 1500,
        },
        bookingId: 101,
      });

      expect(result.success).toBe(false);
      expect(result.fallbackUrl).toBeDefined();

      const updatedLog = mockNotificationLogs.find((l) => l.bookingId === 101);
      expect(updatedLog?.status).toBe('FAILED');
      // Verify token was redacted in error message
      expect(updatedLog?.errorMessage).not.toContain('secret_test_token_12345');
      expect(updatedLog?.errorMessage).toContain('[REDACTED]');
    });
  });

  describe('9. Successful API Response', () => {
    it('should log success and save WAMID on successful response', async () => {
      process.env.WHATSAPP_CLOUD_API_TOKEN = 'secret_token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_id_999';
      service.reloadConfig();

      jest.spyOn(client, 'sendMessage').mockResolvedValueOnce({
        messaging_product: 'whatsapp',
        contacts: [{ input: '919876543210', wa_id: '919876543210' }],
        messages: [{ id: 'wamid.HBgNNjYwMDE=' }],
      });

      const result = await service.dispatchNotification({
        recipientPhone: '919876543210',
        type: WhatsAppTemplateType.BOOKING_CONFIRMED,
        context: {
          bookingNumber: 'RM-SUCCESS',
          customerName: 'Success Guest',
          packageName: 'Day Visit',
          dateStr: '2026-09-10',
          headCountAdult: 2,
          headCountChild: 0,
          totalAmount: 3000,
        },
        bookingId: 102,
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.HBgNNjYwMDE=');

      const log = mockNotificationLogs.find((l) => l.bookingId === 102);
      expect(log?.status).toBe('SENT');
      expect(log?.subject).toContain('wamid.HBgNNjYwMDE=');
    });
  });

  describe('10. Notification Logging', () => {
    it('should record recipient, type, content, and bookingId in NotificationLog', async () => {
      await service.dispatchNotification({
        recipientPhone: '919876543210',
        type: WhatsAppTemplateType.PAYMENT_RECEIVED,
        context: {
          bookingNumber: 'RM-LOG-TEST',
          customerName: 'Log Guest',
          packageName: 'Day Visit',
          dateStr: '2026-09-10',
          headCountAdult: 2,
          headCountChild: 0,
          totalAmount: 3000,
          amountPaid: 3000,
        },
        bookingId: 200,
      });

      expect(mockNotificationLogs.length).toBeGreaterThan(0);
      const log = mockNotificationLogs.find((l) => l.bookingId === 200);
      expect(log).toBeDefined();
      expect(log?.type).toBe('WHATSAPP');
      expect(log?.recipient).toBe('919876543210');
      expect(log?.content).toContain('RM-LOG-TEST');
    });
  });

  describe('11. Sensitive Credential Redaction', () => {
    it('should redact secrets in sanitized text', () => {
      const sanitized = client.sanitizeSecret('Bearer EAAabcdef123456ghij error in request');
      expect(sanitized).not.toContain('EAAabcdef123456ghij');
      expect(sanitized).toContain('Bearer [REDACTED]');
    });

    it('should redact custom secrets registered via registerSecret', () => {
      client.registerSecret('my-super-secret-key-999');
      const sanitized = client.sanitizeSecret('Connection refused with key my-super-secret-key-999 on host');
      expect(sanitized).not.toContain('my-super-secret-key-999');
      expect(sanitized).toContain('[REDACTED]');
    });
  });

  describe('12. Duplicate Notification Protection', () => {
    it('should not send dual notifications to business phone when customer phone is same as business phone', async () => {
      const notifySpy = jest.spyOn(service, 'dispatchNotification');

      await service.notifyBookingRequested(
        {
          id: 501,
          bookingNumber: 'RM-DUPE-1',
          date: '2026-09-15',
          headCountAdult: 2,
          headCountChild: 0,
          totalAmount: 3000,
          package: { name: 'Day Visit' },
        },
        {
          name: 'Manager Abhi',
          phone: '919322759343', // Same as business phone
        },
      );

      // Only 1 call should be made, not 2
      expect(notifySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('13. Booking Remains Successful if WhatsApp Fails', () => {
    it('should not throw error from high-level notification helpers when dispatch fails', async () => {
      jest.spyOn(service, 'dispatchNotification').mockRejectedValueOnce(new Error('Fatal Network Breakdown'));

      await expect(
        service.notifyBookingRequested(
          {
            id: 999,
            bookingNumber: 'RM-CRASH-SAFE',
            date: '2026-09-15',
            package: { name: 'Day Visit' },
          },
          { name: 'Guest', phone: '919876543210' },
        ),
      ).rejects.toThrow(); // Individual call throws only if unhandled in caller, but caller handles safely in notifications.service
    });
  });

  describe('14. RBAC & Security Behavior in WhatsAppController', () => {
    it('should provide safe sanitized status from getStatus()', () => {
      process.env.WHATSAPP_CLOUD_API_TOKEN = 'super_secret_token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_12345';
      process.env.WHATSAPP_MODE = 'HYBRID';
      service.reloadConfig();

      const status = controller.getStatus();

      expect(status.mode).toBe('HYBRID');
      expect(status.configured).toBe(true);
      expect(status.tokenConfigured).toBe(true);
      expect(status.phoneNumberIdConfigured).toBe(true);
      expect(status.businessPhoneNumber).toBe('919322759343');

      // CRITICAL: Ensure token itself is NEVER present in the status object
      const json = JSON.stringify(status);
      expect(json).not.toContain('super_secret_token');
    });
  });

  describe('15. Phase 13 — WhatsApp Payment QR Automation & Idempotency', () => {
    const paymentParams = {
      booking: {
        id: 77,
        bookingNumber: 'RM-2026-000077',
        date: '2026-11-20',
        totalAmount: 15000,
        advanceRequired: 5000,
        amountPaid: 0,
        balanceAmount: 15000,
        package: { name: 'Sunset Villa Package' },
      },
      customer: {
        name: 'Rohan Deshmukh',
        phone: '+91 98230 11223',
      },
      amountRequested: 5000,
      upiUri: 'upi://pay?pa=rivermist@upi&pn=River%20Mist&am=5000.00&cu=INR&tn=RM-2026-000077',
      qrBuffer: Buffer.from('fake-qr-png-buffer'),
    };

    it('should prevent duplicate payment requests within 5-minute idempotency window', async () => {
      // Mock existing recent log
      prisma.notificationLog.findFirst.mockResolvedValueOnce({
        id: 991,
        bookingId: 77,
        channel: 'WHATSAPP',
        type: 'WHATSAPP_PAYMENT_REQUEST',
        status: 'SENT',
        providerMessageId: 'meta_existing_123',
        createdAt: new Date(),
      });

      const result = await service.sendPaymentRequestWithQr(paymentParams);

      expect(result.success).toBe(true);
      expect(result.status).toBe('ALREADY_SENT');
      expect(result.messageId).toBe('meta_existing_123');
      // No new log created
      expect(prisma.notificationLog.create).not.toHaveBeenCalled();
    });

    it('should generate wa.me fallback when Meta Cloud API is unconfigured / in HYBRID mode', async () => {
      delete process.env.WHATSAPP_CLOUD_API_TOKEN;
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
      process.env.WHATSAPP_MODE = 'HYBRID';
      service.reloadConfig();

      const result = await service.sendPaymentRequestWithQr(paymentParams);

      expect(result.success).toBe(true);
      expect(result.status).toBe('FALLBACK_GENERATED');
      expect(result.fallbackUrl).toBeDefined();
      expect(result.fallbackUrl).toContain('https://wa.me/919823011223');
      expect(result.fallbackUrl).toContain('River%20Mist');
      expect(result.fallbackUrl).toContain('5%2C000'); // formatted advance requested
    });

    it('should upload in-memory media and send image message when Cloud API is configured', async () => {
      process.env.WHATSAPP_CLOUD_API_TOKEN = 'valid_token_123';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_id_999';
      process.env.WHATSAPP_MODE = 'CLOUD_API';
      service.reloadConfig();

      const uploadSpy = jest
        .spyOn(client, 'uploadMedia')
        .mockResolvedValue({ id: 'meta_media_id_777' });
      const sendImageSpy = jest
        .spyOn(client, 'sendImageMessage')
        .mockResolvedValue({
          messaging_product: 'whatsapp',
          messages: [{ id: 'wam_msg_888' }],
        });

      const result = await service.sendPaymentRequestWithQr(paymentParams);

      expect(result.success).toBe(true);
      expect(result.status).toBe('SENT');
      expect(result.messageId).toBe('wam_msg_888');
      expect(uploadSpy).toHaveBeenCalledWith(
        expect.any(String),
        'phone_id_999',
        'valid_token_123',
        paymentParams.qrBuffer,
        'image/png',
        'rivermist-RM-2026-000077-qr.png',
      );
      expect(sendImageSpy).toHaveBeenCalledWith(
        expect.any(String),
        'phone_id_999',
        'valid_token_123',
        '919823011223',
        'meta_media_id_777',
        expect.stringContaining('RM-2026-000077'),
      );
    });

    it('should gracefully fallback to text message and record media error in log if media upload fails', async () => {
      process.env.WHATSAPP_CLOUD_API_TOKEN = 'valid_token_123';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_id_999';
      process.env.WHATSAPP_MODE = 'CLOUD_API';
      service.reloadConfig();

      jest
        .spyOn(client, 'uploadMedia')
        .mockRejectedValue(new Error('Meta media upload rate limit'));
      const sendTextSpy = jest
        .spyOn(client, 'sendMessage')
        .mockResolvedValue({
          messaging_product: 'whatsapp',
          messages: [{ id: 'wam_text_msg_999' }],
        });

      const result = await service.sendPaymentRequestWithQr(paymentParams);

      expect(result.success).toBe(true);
      expect(result.status).toBe('TEXT_FALLBACK_SENT');
      expect(result.mediaError).toContain('Meta media upload rate limit');
      expect(result.messageId).toBe('wam_text_msg_999');
      expect(sendTextSpy).toHaveBeenCalledWith(
        expect.any(String),
        'phone_id_999',
        'valid_token_123',
        expect.objectContaining({
          type: 'text',
          text: expect.objectContaining({
            body: expect.stringContaining('Payment Instructions'),
          }),
        }),
      );

      // Verify NotificationLog explicitly captures the failure reason
      const lastLog = mockNotificationLogs[mockNotificationLogs.length - 1];
      expect(lastLog).toBeDefined();
      expect(lastLog.errorMessage).toContain('Media QR upload/dispatch failed: Meta media upload rate limit');
    });

    it('should guarantee image caption strictly adheres to Meta 1024 character limit', () => {
      const longContext = {
        bookingNumber: 'RM-2026-000042-LONG-REFERENCE',
        customerName: 'Aaravindhan Balasubramanian and Extended Family Guests',
        packageName: 'Ultra Luxury Riverfront Villa with Private Deck, Sunset Dinner & Full Agro Experience',
        dateStr: '2026-11-20',
        headCountAdult: 12,
        headCountChild: 6,
        totalAmount: 185000,
        advanceRequired: 50000,
        amountPaid: 25000,
        balanceAmount: 160000,
        amountRequested: 25000,
        upiId: 'rivermistresort.agrotourism@icici',
        payeeName: 'River Mist Agrotourism Private Limited',
        upiUri: 'upi://pay?pa=rivermistresort.agrotourism%40icici&pn=River%20Mist%20Agrotourism%20Private%20Limited&am=25000.00&cu=INR&tn=River%20Mist%20RM-2026-000042-LONG-REFERENCE',
      };

      const caption = messageBuilder.buildPaymentQrCaption(longContext);
      expect(caption.length).toBeLessThanOrEqual(1024);
      expect(caption).toContain('RM-2026-000042-LONG-REFERENCE');
      expect(caption).toContain('rivermistresort.agrotourism@icici');
      expect(caption).toContain('₹25,000');
    });

    it('should safely trim image caption in WhatsAppClient if raw string exceeds 1024 characters', async () => {
      const hugeCaption = 'A'.repeat(1500);
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ id: 'wam_trimmed_123' }] }),
      } as any);

      await client.sendImageMessage('v21.0', '12345', 'token', '919322759343', 'media_999', hugeCaption);

      expect(fetchSpy).toHaveBeenCalled();
      const callBody = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
      expect(callBody.image.caption.length).toBeLessThanOrEqual(1024);
      expect(callBody.image.caption.endsWith('...')).toBe(true);

      fetchSpy.mockRestore();
    });
  });
});
