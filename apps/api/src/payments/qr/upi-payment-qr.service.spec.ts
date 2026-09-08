import { Test, TestingModule } from '@nestjs/testing';
import { UpiPaymentQrService } from './upi-payment-qr.service';
import { BadRequestException } from '@nestjs/common';

jest.setTimeout(30000);

describe('UpiPaymentQrService (Phase 13 UPI & QR Automation)', () => {
  let service: UpiPaymentQrService;

  beforeEach(async () => {
    process.env.PAYMENT_UPI_ID = 'rivermist@icici';
    process.env.PAYMENT_PAYEE_NAME = 'River Mist Agrotourism';

    const module: TestingModule = await Test.createTestingModule({
      providers: [UpiPaymentQrService],
    }).compile();

    service = module.get<UpiPaymentQrService>(UpiPaymentQrService);
  });

  afterEach(() => {
    delete process.env.PAYMENT_UPI_ID;
    delete process.env.PAYMENT_PAYEE_NAME;
  });

  describe('1. Authoritative Amount Calculation', () => {
    it('should request advanceRequired when booking is unpaid and advance is specified', () => {
      const booking = {
        id: 1,
        bookingNumber: 'RM-2026-001024',
        totalAmount: 12000,
        advanceRequired: 3000,
        amountPaid: 0,
        balanceAmount: 12000,
      };

      const calculation = service.calculateAuthoritativeAmount(booking);
      expect(calculation.amountRequested).toBe(3000);
      expect(calculation.isAdvance).toBe(true);
      expect(calculation.remainingAfterPayment).toBe(9000);
    });

    it('should request balanceAmount when advance has already been satisfied', () => {
      const booking = {
        id: 1,
        bookingNumber: 'RM-2026-001024',
        totalAmount: 12000,
        advanceRequired: 3000,
        amountPaid: 3000,
        balanceAmount: 9000,
      };

      const calculation = service.calculateAuthoritativeAmount(booking);
      expect(calculation.amountRequested).toBe(9000);
      expect(calculation.isAdvance).toBe(false);
      expect(calculation.isFullPayment).toBe(true);
    });

    it('should request full totalAmount when advanceRequired is zero and unpaid', () => {
      const booking = {
        id: 1,
        bookingNumber: 'RM-2026-001025',
        totalAmount: 5000,
        advanceRequired: 0,
        amountPaid: 0,
        balanceAmount: 5000,
      };

      const calculation = service.calculateAuthoritativeAmount(booking);
      expect(calculation.amountRequested).toBe(5000);
      expect(calculation.isFullPayment).toBe(true);
    });

    it('should throw BadRequestException when booking is already fully paid (balance <= 0)', () => {
      const booking = {
        id: 1,
        bookingNumber: 'RM-2026-001026',
        totalAmount: 12000,
        advanceRequired: 3000,
        amountPaid: 12000,
        balanceAmount: 0,
      };

      expect(() => service.calculateAuthoritativeAmount(booking)).toThrow(
        BadRequestException,
      );
      expect(() => service.calculateAuthoritativeAmount(booking)).toThrow(
        'already been fully settled',
      );
    });

    it('should throw BadRequestException when booking numbers are invalid', () => {
      const booking = {
        id: 1,
        bookingNumber: 'RM-2026-001027',
        totalAmount: 0,
        advanceRequired: 0,
        amountPaid: 0,
        balanceAmount: 0,
      };

      expect(() => service.calculateAuthoritativeAmount(booking)).toThrow(
        BadRequestException,
      );
    });

    it('should reject payment calculation for CANCELLED, REJECTED, or DRAFT bookings', () => {
      const booking = {
        id: 1,
        bookingNumber: 'RM-2026-001028',
        totalAmount: 10000,
        advanceRequired: 2500,
        amountPaid: 0,
        balanceAmount: 10000,
        status: 'CANCELLED',
      };

      expect(() => service.calculateAuthoritativeAmount(booking)).toThrow('Cannot request payment for a cancelled booking');

      expect(() => service.calculateAuthoritativeAmount({ ...booking, status: 'REJECTED' })).toThrow(
        'Cannot request payment for a rejected booking',
      );

      expect(() => service.calculateAuthoritativeAmount({ ...booking, status: 'DRAFT' })).toThrow(
        'Cannot request payment for a draft booking',
      );
    });

    it('should resist amount tampering: strictly calculates authoritative amount regardless of arbitrary values', () => {
      const booking = {
        id: 1,
        bookingNumber: 'RM-2026-001029',
        totalAmount: 12000,
        advanceRequired: 3000,
        amountPaid: 0,
        balanceAmount: 12000,
        requestedAmountFromClient: 1, // Tampering attempt
      };

      const calculation = service.calculateAuthoritativeAmount(booking);
      // Authoritative calculation must remain 3000, completely ignoring client tampering
      expect(calculation.amountRequested).toBe(3000);
      expect(calculation.amountRequested).not.toBe(1);
    });
  });

  describe('UPI Configuration Safety', () => {
    it('should throw BadRequestException when PAYMENT_UPI_ID is not configured in environment', () => {
      delete process.env.PAYMENT_UPI_ID;
      expect(() => service.getUpiId()).toThrow(BadRequestException);
      expect(() => service.getUpiId()).toThrow('PAYMENT_UPI_ID is not configured');
    });

    it('should throw BadRequestException when generating payment request without PAYMENT_UPI_ID', async () => {
      delete process.env.PAYMENT_UPI_ID;
      const booking = {
        id: 1,
        bookingNumber: 'RM-2026-001030',
        totalAmount: 12000,
        advanceRequired: 3000,
        amountPaid: 0,
        balanceAmount: 12000,
      };

      await expect(service.generatePaymentRequest(booking)).rejects.toThrow(
        'PAYMENT_UPI_ID is not configured',
      );
    });
  });

  describe('2. UPI URI Specification & URL Encoding', () => {
    it('should generate standard upi://pay URI with all required query params', () => {
      const upiUri = service.buildUpiUri({
        amount: 3000,
        bookingNumber: 'RM-2026-001024',
        note: 'River Mist RM-2026-001024',
      });

      expect(upiUri).toContain('upi://pay?');
      expect(upiUri).toContain('pa=rivermist%40icici');
      expect(upiUri).toContain('pn=River%20Mist%20Agrotourism');
      expect(upiUri).toContain('am=3000.00');
      expect(upiUri).toContain('cu=INR');
      expect(upiUri).toContain('tn=River%20Mist%20RM-2026-001024');
    });

    it('should reject non-positive amounts (cannot submit arbitrary <= 0 payment)', () => {
      expect(() =>
        service.buildUpiUri({
          amount: 0,
          bookingNumber: 'RM-2026-001024',
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        service.buildUpiUri({
          amount: -500,
          bookingNumber: 'RM-2026-001024',
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when UPI ID is missing', () => {
      expect(() =>
        service.buildUpiUri({
          upiId: '',
          amount: 1000,
          bookingNumber: 'RM-2026-001024',
        }),
      ).toThrow(BadRequestException);
      expect(() =>
        service.buildUpiUri({
          upiId: '',
          amount: 1000,
          bookingNumber: 'RM-2026-001024',
        }),
      ).toThrow('PAYMENT_UPI_ID is not configured');
    });
  });

  describe('3. In-Memory QR Generation (Render Ephemeral Safety)', () => {
    it('should generate valid PNG buffer in memory without writing to disk', async () => {
      const upiUri = service.buildUpiUri({
        amount: 2500,
        bookingNumber: 'RM-2026-001024',
      });

      const buffer = await service.generateQrBuffer(upiUri);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);

      // Verify PNG magic header bytes: 89 50 4E 47 0D 0A 1A 0A
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
      expect(buffer[4]).toBe(0x0d); // \r
      expect(buffer[5]).toBe(0x0a); // \n
      expect(buffer[6]).toBe(0x1a);
      expect(buffer[7]).toBe(0x0a); // \n
    }, 25000);

    it('should generate base64 Data URL for secure frontend preview', async () => {
      const upiUri = service.buildUpiUri({
        amount: 2500,
        bookingNumber: 'RM-2026-001024',
      });

      const dataUrl = await service.generateQrDataUrl(upiUri);
      expect(typeof dataUrl).toBe('string');
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
      expect(dataUrl.length).toBeGreaterThan(200);
    }, 25000);
  });

  describe('4. Full Server-Authoritative Pipeline', () => {
    it('should generate complete payment QR payload for a booking', async () => {
      const booking = {
        id: 42,
        bookingNumber: 'RM-2026-000042',
        totalAmount: 18000,
        advanceRequired: 4500,
        amountPaid: 0,
        balanceAmount: 18000,
      };

      const result = await service.generatePaymentQr(booking);

      expect(result.amount).toBe(4500);
      expect(result.upiUri).toContain('am=4500.00');
      expect(result.upiUri).toContain('RM-2026-000042');
      expect(Buffer.isBuffer(result.qrBuffer)).toBe(true);
      expect(result.qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    }, 25000);
  });
});
