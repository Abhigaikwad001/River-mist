import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('Authentication & Authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    email: 'testauth@example.com',
    password: 'password123',
    name: 'Test Auth User',
    phone: '1234567890'
  };

  const testAdmin = {
    email: 'adminauth@example.com',
    password: 'password123',
    name: 'Test Auth Admin',
    role: Role.SUPER_ADMIN
  };

  let userToken: string;
  let adminToken: string;
  let testUserId: number;
  let testAdminId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    
    // Clean up
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, testAdmin.email] } }
    });

    // Create admin manually for RBAC tests
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(testAdmin.password, salt);
    
    const admin = await prisma.user.create({
      data: {
        email: testAdmin.email,
        name: testAdmin.name,
        passwordHash,
        role: testAdmin.role
      }
    });
    testAdminId = admin.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [testUser.email, testAdmin.email] } }
    });
    await app.close();
  });

  describe('Authentication Flow', () => {
    it('/auth/register (POST) - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          expect(res.body.user.email).toBe(testUser.email);
          expect(res.body.user.role).toBe(Role.USER); // Default role
          testUserId = res.body.user.id;
        });
    });

    it('/auth/login (POST) - should login user and return token', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          userToken = res.body.access_token;
        });
    });

    it('/auth/login (POST) - should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('/auth/login (POST) - should login admin and return token', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.access_token).toBeDefined();
          adminToken = res.body.access_token;
        });
    });
  });

  describe('Authorization Flow (RBAC)', () => {
    it('/users/me (GET) - should return profile for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe(testUser.email);
          expect(res.body.role).toBe(Role.USER);
        });
    });

    it('/users/me (GET) - should reject unauthenticated request', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });

    it('/admin/stats (GET) - should reject normal user with 403 Forbidden', () => {
      return request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('/admin/stats (GET) - should allow SUPER_ADMIN', () => {
      return request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200); // Or whatever status it returns if mock data is fine
    });
    
    it('/users (GET) - should allow SUPER_ADMIN to fetch all users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });
  });
});
