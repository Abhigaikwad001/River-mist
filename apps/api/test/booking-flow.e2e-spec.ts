import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentsService } from '../src/payments/payments.service';
import { EventType, BookingStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

describe('Critical Booking Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  
  let adminToken: string;
  let userToken: string;
  let userId: number;
  let packageId: number;
  let activityId: number;
  let bookingId: number;
  let razorpayOrderId = 'order_test_123';
  let razorpayPaymentId = 'pay_test_123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // Mock Razorpay on PaymentsService
    const paymentsService = app.get(PaymentsService);
    (paymentsService as any).razorpay = {
      orders: {
        create: jest.fn().mockResolvedValue({ id: razorpayOrderId }),
      },
      payments: {
        refund: jest.fn().mockResolvedValue({ id: 'rfnd_123' }),
      }
    };

    // Clean DB
    await prisma.payment.deleteMany();
    await prisma.bookingActivity.deleteMany();
    await prisma.bookingResource.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.package.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.user.deleteMany();

    // Seed Data
    const pwdHash = await bcrypt.hash('password123', 10);
    
    // Seed Guest (required by BookingsService if no token)
    await prisma.user.create({
      data: { email: 'guest@example.com', passwordHash: pwdHash, name: 'Guest User', role: 'USER' }
    });

    // Seed Normal User
    const user = await prisma.user.create({
      data: { email: 'customer@example.com', passwordHash: pwdHash, name: 'Test Customer', role: 'USER' }
    });
    userId = user.id;

    // Seed Admin
    await prisma.user.create({
      data: { email: 'admin@example.com', passwordHash: pwdHash, name: 'Admin', role: 'SUPER_ADMIN' }
    });

    // Seed Package
    const pkg = await prisma.package.create({
      data: { name: 'Test Package', slug: 'test-package', description: 'Test', experienceType: 'DAY_TOURISM', priceAdult: 1000, priceChild: 500, minGuests: 5, active: true }
    });
    packageId = pkg.id;

    // Seed Activity
    const act = await prisma.activity.create({
      data: { name: 'Test Activity', description: 'Test', pricingType: 'PER_PERSON', price: 200, active: true }
    });
    activityId = act.id;

    // Seed Resources
    await prisma.resource.createMany({
      data: [
        { name: 'General Day Tourism', type: 'VENUE', capacity: 50, active: true },
        { name: 'Main Dining', type: 'VENUE', capacity: 100, active: true },
        { name: 'Parking', type: 'EQUIPMENT', capacity: 20, active: true },
      ]
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Authenticate users', async () => {
    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'customer@example.com', password: 'password123' })
      .expect(201);
    
    userToken = userLogin.body.access_token;
    expect(userToken).toBeDefined();

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' })
      .expect(201);
      
    adminToken = adminLogin.body.access_token;
    expect(adminToken).toBeDefined();
  });

  it('2. Verify Capacity limits (Failure Case: Overcapacity)', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        date: '2050-01-01',
        type: EventType.CORPORATE_EVENT,
        packageId,
        headCountAdult: 100, // Exceeds 50
        headCountChild: 0,
        activityIds: [activityId]
      })
      .expect(400); // Should fail capacity check
  });

  it('3. Successful Booking Request', async () => {
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        date: '2050-01-01',
        type: EventType.CORPORATE_EVENT,
        packageId,
        headCountAdult: 10,
        headCountChild: 0,
        activityIds: [activityId]
      })
      .expect(201);

    bookingId = response.body.id;
    expect(response.body.status).toBe(BookingStatus.REQUESTED);
    expect(response.body.userId).toBe(userId);
    
    // Server Pricing Calculation:
    // Package Adult: 10 * 1000 = 10000
    // Activity: 10 * 200 = 2000
    // Total = 12000
    expect(response.body.totalAmount).toBe(12000);
  });

  it('4. Admin Approval', async () => {
    const res = await request(app.getHttpServer())
      .post(`/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: BookingStatus.APPROVED })
      .expect(201);
      
    expect(res.body.status).toBe(BookingStatus.APPROVED);
  });

  it('5. Payment Creation (Mocked)', async () => {
    const res = await request(app.getHttpServer())
      .post('/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookingId })
      .expect(201);

    expect(res.body.orderId).toBe(razorpayOrderId);
    expect(res.body.amount).toBe(1200000); // 12000 in paise
  });

  it('6. Failure Case: Payment Verification with Invalid Signature', async () => {
    await request(app.getHttpServer())
      .post('/payments/verify')
      .send({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: 'invalid_signature_hash'
      })
      .expect(400);
  });

  it('7. Payment Verification & Confirmation', async () => {
    // Generate valid signature
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test-razorpay-secret')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const res = await request(app.getHttpServer())
      .post('/payments/verify')
      .send({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: signature
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    
    // Confirm booking status updated to CONFIRMED
    const bookingRes = await request(app.getHttpServer())
      .get(`/bookings/status/${bookingId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
      
    expect(bookingRes.body.status).toBe(BookingStatus.CONFIRMED);
  });

  it('8. Failure Case: Unauthorized IDOR Access', async () => {
    // Try to fetch the booking without being the owner or admin
    // We can simulate this by fetching as a guest without auth (since OptionalJwtAuthGuard is used)
    await request(app.getHttpServer())
      .get(`/bookings/${bookingId}`)
      .expect(403);
  });
});
