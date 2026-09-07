import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('Website Content Management (CMS) System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'user-cms@example.com',
    password: 'password123',
    name: 'CMS Test User',
  };

  const testAdmin = {
    email: 'admin-cms@example.com',
    password: 'password123',
    name: 'CMS Admin User',
    role: Role.SUPER_ADMIN,
  };

  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean previous test data
    await prisma.siteContent.deleteMany({
      where: { key: { in: ['e2e.test.key', 'e2e.unsafe.key'] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, testAdmin.email] } },
    });

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

    // Register Normal User
    const userRegRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);
    userToken = userRegRes.body.access_token;
  });

  afterAll(async () => {
    await prisma.siteContent.deleteMany({
      where: { key: { in: ['e2e.test.key', 'e2e.unsafe.key'] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, testAdmin.email] } },
    });
    await app.close();
  });

  describe('CMS Content Management & RBAC', () => {
    it('/content (POST) - should allow SUPER_ADMIN to create content block', () => {
      return request(app.getHttpServer())
        .post('/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'e2e.test.key',
          title: 'E2E Test Heading',
          subtitle: 'E2E Test Subheading',
          content: 'E2E test body content block.',
          category: 'HERO',
          active: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.key).toBe('e2e.test.key');
          expect(res.body.title).toBe('E2E Test Heading');
        });
    });

    it('/content (POST) - should reject normal USER with 403 Forbidden', () => {
      return request(app.getHttpServer())
        .post('/content')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          key: 'e2e.unauthorized.key',
          title: 'Hacker Heading',
        })
        .expect(403);
    });

    it('/content (GET) - should retrieve public content list', () => {
      return request(app.getHttpServer())
        .get('/content?category=HERO')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          const found = res.body.find((item: any) => item.key === 'e2e.test.key');
          expect(found).toBeDefined();
        });
    });

    it('/content/:key (GET) - should retrieve content block by key', () => {
      return request(app.getHttpServer())
        .get('/content/e2e.test.key')
        .expect(200)
        .expect((res) => {
          expect(res.body.key).toBe('e2e.test.key');
          expect(res.body.title).toBe('E2E Test Heading');
        });
    });

    it('/content (POST) - should sanitize script tags from text input', () => {
      return request(app.getHttpServer())
        .post('/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'e2e.test.key',
          title: 'Clean Title <script>alert("XSS")</script>',
          content: 'Clean Content <script>console.log("bad")</script>',
          category: 'HERO',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe('Clean Title ');
          expect(res.body.content).toBe('Clean Content ');
        });
    });

    it('/content (POST) - should reject unsafe javascript: URLs', () => {
      return request(app.getHttpServer())
        .post('/content')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'e2e.unsafe.key',
          title: 'Unsafe URL Title',
          image: 'javascript:alert(1)',
          category: 'HERO',
        })
        .expect(400);
    });

    it('/content/:key (DELETE) - should allow admin to delete content block', () => {
      return request(app.getHttpServer())
        .delete('/content/e2e.test.key')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.key).toBe('e2e.test.key');
        });
    });
  });
});
