import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

export interface AuthoritativePaymentCalculation {
  bookingId: number;
  bookingNumber: string;
  totalAmount: number;
  amountPaid: number;
  amountRequested: number;
  advanceRequired: number;
  balanceAmount: number;
  remainingAfterPayment: number;
  isAdvance: boolean;
  isFullPayment: boolean;
}

export interface GeneratedPaymentRequest {
  calculation: AuthoritativePaymentCalculation;
  financials: AuthoritativePaymentCalculation;
  amount: number;
  bookingId: number;
  bookingNumber: string;
  upiId: string;
  payeeName: string;
  upiUri: string;
  qrBuffer: Buffer;
  qrDataUrl: string;
  transactionNote: string;
}

@Injectable()
export class UpiPaymentQrService {
  private readonly logger = new Logger(UpiPaymentQrService.name);

  getUpiId(): string {
    const upiId = process.env.PAYMENT_UPI_ID?.trim();
    if (!upiId) {
      throw new BadRequestException('PAYMENT_UPI_ID is not configured.');
    }
    return upiId;
  }

  getPayeeName(): string {
    return process.env.PAYMENT_PAYEE_NAME?.trim() || 'River Mist';
  }

  /**
   * Authoritatively calculates the exact payment amount currently due.
   * Never trusts client-supplied amounts or customer message input.
   */
  calculateAuthoritativeAmount(booking: {
    id: number;
    bookingNumber: string;
    status?: string;
    totalAmount: number;
    advanceRequired: number;
    amountPaid: number;
    balanceAmount: number;
  }): AuthoritativePaymentCalculation {
    if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') {
      throw new BadRequestException(`Cannot request payment for a ${booking.status.toLowerCase()} booking.`);
    }

    if (booking.status === 'DRAFT') {
      throw new BadRequestException('Cannot request payment for a draft booking.');
    }

    const total = Number(booking.totalAmount) || 0;
    const paid = Number(booking.amountPaid) || 0;
    const advance = Number(booking.advanceRequired) || 0;
    const balance = Math.max(0, total - paid);

    if (total <= 0) {
      throw new BadRequestException(`Booking #${booking.bookingNumber} total amount must be greater than zero.`);
    }

    if (balance <= 0 || (total > 0 && paid >= total)) {
      throw new BadRequestException(`Booking #${booking.bookingNumber} has already been fully settled.`);
    }

    let amountRequested: number;
    let isAdvance = false;

    if (paid === 0) {
      // First payment: require advance if configured, or full amount
      if (advance > 0 && advance < total) {
        amountRequested = advance;
        isAdvance = true;
      } else {
        amountRequested = total;
      }
    } else {
      // Subsequent payment: request remaining balance
      amountRequested = balance;
    }

    const remainingAfterPayment = Math.max(0, balance - amountRequested);
    const isFullPayment = amountRequested === total || remainingAfterPayment === 0;

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      totalAmount: total,
      amountPaid: paid,
      amountRequested,
      advanceRequired: advance,
      balanceAmount: balance,
      remainingAfterPayment,
      isAdvance,
      isFullPayment,
    };
  }

  /**
   * Generates a standard-compliant, URL-encoded UPI Payment URI.
   * Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
   */
  buildUpiUri(options: {
    upiId?: string;
    payeeName?: string;
    amount: number;
    bookingNumber: string;
    note?: string;
  }): string;
  buildUpiUri(
    upiId: string,
    payeeName: string,
    amount: number,
    bookingNumber: string,
  ): { upiUri: string; transactionNote: string };
  buildUpiUri(
    arg1: any,
    arg2?: string,
    arg3?: number,
    arg4?: string,
  ): any {
    let upiId: string;
    let payeeName: string;
    let amount: number;
    let bookingNumber: string;
    let customNote: string | undefined;
    let isObjectCall = false;

    if (typeof arg1 === 'object' && arg1 !== null) {
      isObjectCall = true;
      upiId = arg1.upiId !== undefined ? arg1.upiId : this.getUpiId();
      payeeName = arg1.payeeName || this.getPayeeName();
      amount = Number(arg1.amount);
      bookingNumber = String(arg1.bookingNumber || '');
      customNote = arg1.note;
    } else {
      upiId = String(arg1 || '');
      payeeName = String(arg2 || this.getPayeeName());
      amount = Number(arg3);
      bookingNumber = String(arg4 || '');
    }

    if (!upiId || upiId.trim() === '') {
      throw new BadRequestException('PAYMENT_UPI_ID is not configured.');
    }

    if (amount <= 0 || isNaN(amount)) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    if (!upiId.includes('@')) {
      this.logger.warn(`Invalid or placeholder UPI ID configured: ${upiId}`);
    }

    const formattedAmount = amount.toFixed(2);
    const transactionNote = customNote || `River Mist ${bookingNumber}`;

    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: formattedAmount,
      cu: 'INR',
      tn: transactionNote,
    });

    const upiUri = `upi://pay?${params.toString().replace(/\+/g, '%20')}`;

    if (isObjectCall) {
      return upiUri;
    }

    return {
      upiUri,
      transactionNote,
    };
  }

  /**
   * Generates an in-memory PNG Buffer for the UPI URI.
   * Zero disk footprint, avoiding ephemeral local disk loss on Render.
   */
  async generateQrBuffer(upiUri: string): Promise<Buffer> {
    return QRCode.toBuffer(upiUri, {
      type: 'png',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }

  /**
   * Generates a base64 Data URL for web previews.
   */
  async generateQrDataUrl(upiUri: string): Promise<string> {
    return QRCode.toDataURL(upiUri, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }

  /**
   * Full authoritative payment request generation pipeline.
   */
  async generatePaymentRequest(booking: {
    id: number;
    bookingNumber: string;
    status?: string;
    totalAmount: number;
    advanceRequired: number;
    amountPaid: number;
    balanceAmount: number;
  }): Promise<GeneratedPaymentRequest> {
    const calculation = this.calculateAuthoritativeAmount(booking);
    const upiId = this.getUpiId();
    const payeeName = this.getPayeeName();
    const { upiUri, transactionNote } = this.buildUpiUri(
      upiId,
      payeeName,
      calculation.amountRequested,
      calculation.bookingNumber,
    );

    const [qrBuffer, qrDataUrl] = await Promise.all([
      this.generateQrBuffer(upiUri),
      this.generateQrDataUrl(upiUri),
    ]);

    return {
      calculation,
      financials: calculation,
      amount: calculation.amountRequested,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      upiId,
      payeeName,
      upiUri,
      qrBuffer,
      qrDataUrl,
      transactionNote,
    };
  }

  /**
   * Alias for generatePaymentRequest.
   */
  async generatePaymentQr(booking: any): Promise<GeneratedPaymentRequest> {
    return this.generatePaymentRequest(booking);
  }
}
