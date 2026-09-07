import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('Media Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'normaluser_media@example.com',
    password: 'password123',
    name: 'Normal User',
  };

  const testAdmin = {
    email: 'admin_media@example.com',
    password: 'password123',
    name: 'Admin User',
    role: Role.SUPER_ADMIN,
  };

  let userToken: string;
  let adminToken: string;
  let createdMediaId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, testAdmin.email] } },
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    await prisma.user.create({
      data: {
        email: testUser.email,
        name: testUser.name,
        passwordHash,
        role: Role.USER,
      },
    });

    await prisma.user.create({
      data: {
        email: testAdmin.email,
        name: testAdmin.name,
        passwordHash,
        role: Role.SUPER_ADMIN,
      },
    });

    // Obtain tokens
    const userRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: 'password123' });
    userToken = userRes.body.access_token;

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testAdmin.email, password: 'password123' });
    adminToken = adminRes.body.access_token;
  });

  afterAll(async () => {
    if (createdMediaId) {
      await prisma.media.deleteMany({ where: { id: createdMediaId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, testAdmin.email] } },
    });
    await app.close();
  });

  describe('/media (GET)', () => {
    it('should be accessible publicly', () => {
      return request(app.getHttpServer())
        .get('/media')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });
  });

  describe('/media (POST)', () => {
    it('should reject unauthenticated request with 401', () => {
      return request(app.getHttpServer())
        .post('/media')
        .send({ url: 'https://example.com/img.jpg', category: 'GALLERY' })
        .expect(401);
    });

    it('should reject non-admin user with 403', () => {
      return request(app.getHttpServer())
        .post('/media')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ url: 'https://example.com/img.jpg', category: 'GALLERY' })
        .expect(403);
    });

    it('should allow admin to create media asset', () => {
      return request(app.getHttpServer())
        .post('/media')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          url: 'https://example.com/e2e-test.jpg',
          title: 'E2E Test Image',
          altText: 'E2E Alt Text',
          category: 'GALLERY',
          isFeatured: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe('E2E Test Image');
          expect(res.body.isFeatured).toBe(true);
          createdMediaId = res.body.id;
        });
    });
  });

  describe('/media/:id (PATCH)', () => {
    it('should allow admin to update media asset', () => {
      return request(app.getHttpServer())
        .patch(`/media/${createdMediaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated E2E Title', isFeatured: false })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated E2E Title');
          expect(res.body.isFeatured).toBe(false);
        });
    });
  });

  describe('/media/bulk (POST)', () => {
    it('should execute bulk deactivate action', () => {
      return request(app.getHttpServer())
        .post('/media/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'DEACTIVATE', ids: [createdMediaId] })
        .expect(201);
    });
  });

  describe('/media/:id (DELETE)', () => {
    it('should allow admin to delete media asset', () => {
      return request(app.getHttpServer())
        .delete(`/media/${createdMediaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
