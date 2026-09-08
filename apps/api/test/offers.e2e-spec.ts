import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, BookingStatus } from '@prisma/client';

describe('Offers & Discounts System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'user-offers@example.com',
    password: 'password123',
    name: 'Offer Test User',
  };

  const testAdmin = {
    email: 'admin-offers@example.com',
    password: 'password123',
    name: 'Offer Admin User',
    role: Role.SUPER_ADMIN,
  };

  let userToken: string;
  let adminToken: string;
  let createdPackageId: number;
  let createdDiscountId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Helper function for safe cleanup
    const cleanupTestData = async () => {
      const userBookings = await prisma.booking.findMany({
        where: { user: { email: { in: [testUser.email, 'guest-offer@example.com'] } } },
        select: { id: true },
      });
      const bookingIds = userBookings.map((b) => b.id);
      if (bookingIds.length > 0) {
        await prisma.notificationLog.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await prisma.payment.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await prisma.bookingActivity.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await prisma.bookingResource.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await prisma.booking.deleteMany({
          where: { id: { in: bookingIds } },
        });
      }
      await prisma.discount.deleteMany({
        where: { code: { in: ['E2EMONSOON20', 'E2EFIXED500', 'E2EEXPIRED'] } },
      });
      await prisma.package.deleteMany({
        where: { name: 'E2E Offer Package' },
      });
      await prisma.user.deleteMany({
        where: { email: { in: [testUser.email, testAdmin.email] } },
      });
    };

    // Cleanup previous test data
    await cleanupTestData();

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash(testAdmin.password, salt);
    await prisma.user.create({
      data: {
        email: testAdmin.email,
        name: testAdmin.name,
        passwordHash: adminPasswordHash,
        role: testAdmin.role,
      },
    });

    // Login Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testAdmin.email, password: testAdmin.password });
    adminToken = adminLoginRes.body.access_token;

    // Register User
    const userRegRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);
    userToken = userRegRes.body.access_token;

    // Create a test package for booking
    const pkg = await prisma.package.create({
      data: {
        name: 'E2E Offer Package',
        slug: 'e2e-offer-package',
        description: 'E2E Offer Package Description',
        experienceType: 'DAY_TOURISM',
        priceAdult: 2000,
        priceChild: 1000,
        minGuests: 1,
        maxGuests: 50,
        active: true,
      },
    });
    createdPackageId = pkg.id;
  });

  afterAll(async () => {
    // Cleanup
    const userBookings = await prisma.booking.findMany({
      where: { user: { email: { in: [testUser.email, 'guest-offer@example.com'] } } },
      select: { id: true },
    });
    const bookingIds = userBookings.map((b) => b.id);
    if (bookingIds.length > 0) {
      await prisma.notificationLog.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await prisma.payment.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await prisma.bookingActivity.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await prisma.bookingResource.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await prisma.booking.deleteMany({
        where: { id: { in: bookingIds } },
      });
    }
    await prisma.discount.deleteMany({
      where: { code: { in: ['E2EMONSOON20', 'E2EFIXED500', 'E2EEXPIRED'] } },
    });
    await prisma.package.deleteMany({
      where: { name: 'E2E Offer Package' },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, testAdmin.email] } },
    });
    await app.close();
  });

  describe('Admin Offer Management & RBAC', () => {
    it('/discounts (POST) - should allow admin to create a percentage offer', () => {
      return request(app.getHttpServer())
        .post('/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'E2EMONSOON20',
          name: 'E2E Monsoon Special',
          description: '20% off test discount',
          type: 'PERCENTAGE',
          value: 20,
          minBookingAmount: 1000,
          maxDiscountAmount: 1000,
          validFrom: '2026-01-01T00:00:00.000Z',
          validUntil: '2026-12-31T23:59:59.000Z',
          usageLimit: 50,
          perCustomerLimit: 2,
          applicablePackages: [String(createdPackageId)],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.code).toBe('E2EMONSOON20');
          createdDiscountId = res.body.id;
        });
    });

    it('/discounts (POST) - should reject normal user with 403 Forbidden', () => {
      return request(app.getHttpServer())
        .post('/discounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'UNAUTHORIZED_CODE',
          name: 'Hacker Offer',
          type: 'FIXED_AMOUNT',
          value: 500,
          validFrom: '2026-01-01T00:00:00.000Z',
          validUntil: '2026-12-31T23:59:59.000Z',
        })
        .expect(403);
    });

    it('/discounts (GET) - should list all discounts for admin', () => {
      return request(app.getHttpServer())
        .get('/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          const found = res.body.find((d: any) => d.code === 'E2EMONSOON20');
          expect(found).toBeDefined();
        });
    });
  });

  describe('Offer Validation API (/discounts/validate)', () => {
    it('/discounts/validate (POST) - should validate valid percentage discount', () => {
      return request(app.getHttpServer())
        .post('/discounts/validate')
        .send({
          code: 'e2emonsoon20', // case insensitivity check
          packageId: createdPackageId,
          headCountAdult: 2, // 2 * 2000 = 4000 subtotal
          headCountChild: 0,
          subtotal: 4000,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.eligible).toBe(true);
          expect(res.body.subtotal).toBe(4000);
          expect(res.body.discountAmount).toBe(800); // 20% of 4000 = 800
          expect(res.body.finalTotal).toBe(3200);
        });
    });

    it('/discounts/validate (POST) - should reject invalid discount code cleanly', () => {
      return request(app.getHttpServer())
        .post('/discounts/validate')
        .send({
          code: 'NON_EXISTENT_CODE',
          packageId: createdPackageId,
          headCountAdult: 2,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid or inactive discount code');
        });
    });
  });

  describe('Booking Integration & Anti-Tampering', () => {
    it('/bookings (POST) - should create booking with authoritative server-calculated discount', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          packageId: createdPackageId,
          date: '2026-09-15T00:00:00.000Z',
          type: 'DAY_TOURISM',
          headCountAdult: 2,
          headCountChild: 1, // 2 * 2000 + 1 * 1000 = 5000 subtotal
          discountCode: 'E2EMONSOON20', // 20% of 5000 = 1000 discount
          // Tampered fields sent by client - must be ignored!
          subtotalAmount: 100,
          discountAmount: 4999,
          totalAmount: 1,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.bookingNumber).toBeDefined();
          expect(res.body.status).toBe(BookingStatus.REQUESTED);
          expect(res.body.subtotalAmount).toBe(5000); // DB authoritative subtotal
          expect(res.body.discountAmount).toBe(1000); // DB authoritative 20% discount
          expect(res.body.totalAmount).toBe(4000); // 5000 - 1000 = 4000
          expect(res.body.discountCode).toBe('E2EMONSOON20');
          expect(res.body.discountType).toBe('PERCENTAGE');
          expect(res.body.discountValue).toBe(20);
        });
    });

    it('should verify historical discount snapshot remains intact after discount update', async () => {
      // Fetch created booking
      const booking = await prisma.booking.findFirst({
        where: { packageId: createdPackageId },
      });
      expect(booking).toBeDefined();
      expect(booking?.totalAmount).toBe(4000);

      // Now Admin changes E2EMONSOON20 discount value from 20% to 10%
      await prisma.discount.update({
        where: { id: createdDiscountId },
        data: { value: 10 },
      });

      // Refetch historical booking - must STILL be 4000 total with 1000 discount!
      const historicalBooking = await prisma.booking.findUnique({
        where: { id: booking!.id },
      });
      expect(historicalBooking?.subtotalAmount).toBe(5000);
      expect(historicalBooking?.discountAmount).toBe(1000);
      expect(historicalBooking?.totalAmount).toBe(4000);
    });
  });
});
