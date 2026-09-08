import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return liveness status', () => {
    const liveness = controller.getLiveness();
    expect(liveness.status).toBe('ok');
    expect(typeof liveness.uptime).toBe('number');
    expect(liveness.timestamp).toBeDefined();
  });

  it('should return readiness status when database is reachable', async () => {
    const readiness = await controller.getReadiness();
    expect(readiness.status).toBe('ok');
    expect(readiness.database).toBe('connected');
  });

  it('should throw 503 when database check fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));

    try {
      await controller.getReadiness();
      fail('Expected getReadiness to throw');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      const response = err.getResponse();
      expect(response.database).toBe('disconnected');
    }
  });
});
