import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'Create a Razorpay order for a booking' })
  @UseGuards(OptionalJwtAuthGuard)
  @Post('create-order')
  createOrder(@Request() req: any, @Body() body: { bookingId: number }) {
    return this.paymentsService.createOrder(body.bookingId, req.user?.id);
  }

  @ApiOperation({ summary: 'Verify a Razorpay payment' })
  @Post('verify')
  verifyPayment(@Body() body: { razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string }) {
    return this.paymentsService.verifyPayment(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature);
  }

  @ApiOperation({ summary: 'Razorpay Webhook handler' })
  @Post('webhook')
  handleWebhook(@Request() req: any, @Body() body: any) {
    const signature = req.headers['x-razorpay-signature'] as string;
    return this.paymentsService.handleWebhook(body, signature);
  }

  @ApiOperation({ summary: 'Record a manual payment (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_MANAGER)
  @Post('manual')
  recordManualPayment(@Body() body: { bookingId: number, amount: number, method: string }) {
    return this.paymentsService.recordManualPayment(body.bookingId, body.amount, body.method || 'CASH');
  }

  @ApiOperation({ summary: 'Get all payments (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_MANAGER)
  @Get()
  getAllPayments() {
    return this.paymentsService.getAllPayments();
  }

  @ApiOperation({ summary: 'Refund a payment (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_MANAGER)
  @Post('refund')
  refundPayment(@Body() body: { paymentId: number, amount?: number }) {
    return this.paymentsService.refundPayment(body.paymentId, body.amount);
  }
}
