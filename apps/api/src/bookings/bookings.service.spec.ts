import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CapacityService } from '../capacity/capacity.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: CapacityService,
          useValue: {
            validateAndLockCapacity: jest.fn().mockResolvedValue(true)
          }
        },
        {
          provide: PrismaService,
          useValue: {
            booking: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            }
          }
        },
        {
          provide: NotificationsService,
          useValue: {
            sendBookingRequested: jest.fn(),
            sendBookingStatusUpdated: jest.fn(),
          }
        }
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
