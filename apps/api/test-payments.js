const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    // We need to fetch the actual secrets from the running API environment,
    require('dotenv').config();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret_placeholder';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder';

    // 1. Create a dummy user and booking to test with
    const user = await prisma.user.upsert({
      where: { email: 'payment.tester@example.com' },
      update: {},
      create: {
        email: 'payment.tester@example.com',
        name: 'Payment Tester',
        passwordHash: 'hash',
        role: 'USER',
        phone: '1234567890'
      }
    });

    const pkg = await prisma.package.findFirst();
    if (!pkg) {
      throw new Error('No packages found in DB. Please seed the DB.');
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `TEST-PAY-${Date.now()}`,
        date: new Date(),
        type: 'DAY_TOURISM',
        status: 'PAYMENT_PENDING',
        user: { connect: { id: user.id } },
        package: { connect: { id: pkg.id } },
        headCountAdult: 2,
        headCountChild: 0,
        totalAmount: 1000,
        advanceRequired: 1000,
        balanceAmount: 1000,
        notes: 'Test booking for payments',
      }
    });

    const orderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;

    // 2. Create the initiated payment record (normally done by createOrder)
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: 1000,
        method: 'RAZORPAY',
        status: 'INITIATED',
        razorpayOrderId: orderId
      }
    });

    console.log(`Created test booking ${booking.id} and payment order ${orderId}`);

    // 3. Test Webhook (`/payments/webhook`)
    console.log('\n--- Testing Webhook ---');
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 100000,
            status: 'captured'
          }
        }
      }
    };

    const webhookSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex');

    const webhookRes = await axios.post('http://localhost:3001/payments/webhook', webhookPayload, {
      headers: {
        'x-razorpay-signature': webhookSignature,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Webhook response status: ${webhookRes.status}`);
    
    // Check DB
    let updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    let updatedPayment = await prisma.payment.findFirst({ where: { razorpayOrderId: orderId } });
    
    console.log(`DB after Webhook - Booking Status: ${updatedBooking.status}, Payment Status: ${updatedPayment.status}`);
    
    // 4. Test Frontend Verify Endpoint (`/payments/verify`) - Idempotency
    console.log('\n--- Testing Frontend Verify (Idempotency) ---');
    
    const verifyBody = orderId + "|" + paymentId;
    const verifySignature = crypto
      .createHmac('sha256', keySecret)
      .update(verifyBody)
      .digest('hex');

    const verifyRes = await axios.post('http://localhost:3001/payments/verify', {
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: verifySignature
    });

    console.log(`Verify response status: ${verifyRes.status}`);
    console.log(`Verify response data:`, verifyRes.data);

    updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    updatedPayment = await prisma.payment.findFirst({ where: { razorpayOrderId: orderId } });
    
    console.log(`DB after Verify - Booking Status: ${updatedBooking.status}, Payment Status: ${updatedPayment.status}`);
    
    if (updatedBooking.status === 'CONFIRMED' && updatedPayment.status === 'CAPTURED') {
      console.log('\n✅ PAYMENT FINANCIAL LIFECYCLE VERIFICATION SUCCESSFUL!');
    } else {
      console.log('\n❌ VERIFICATION FAILED. DB state is incorrect.');
    }

  } catch (err) {
    console.error('Error during test:', err.response?.data || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
