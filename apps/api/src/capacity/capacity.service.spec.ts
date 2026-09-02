import { Test, TestingModule } from '@nestjs/testing';
import { CapacityService } from './capacity.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CapacityService', () => {
  let service: CapacityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapacityService,
        {
          provide: PrismaService,
          useValue: {
            booking: { findMany: jest.fn() }
          }
        }
      ],
    }).compile();

    service = module.get<CapacityService>(CapacityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
