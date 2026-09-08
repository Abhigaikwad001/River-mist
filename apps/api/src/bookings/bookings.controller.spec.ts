import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

describe('BookingsController', () => {
  let controller: BookingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: {
            createBooking: jest.fn(),
            getMyBookings: jest.fn(),
            checkCapacity: jest.fn(),
            getAllBookings: jest.fn(),
            updateBookingStatus: jest.fn(),
            confirmAvailability: jest.fn().mockResolvedValue({ id: 101, status: 'APPROVED' }),
            sendPaymentRequest: jest.fn().mockResolvedValue({ success: true }),
            getPaymentQr: jest.fn().mockResolvedValue({ amount: 3000, upiUri: 'upi://pay...' }),
          }
        }
      ]
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call confirmAvailability with parsed id and actor user id', async () => {
    const service = (controller as any).bookingsService;
    const req = { user: { id: 7, role: 'BOOKING_MANAGER' } };

    const result = await controller.confirmAvailability('101', req);
    expect(service.confirmAvailability).toHaveBeenCalledWith(101, 7);
    expect(result).toEqual({ id: 101, status: 'APPROVED' });
  });

  it('should call sendPaymentRequest with parsed id, actor user id, and force flag', async () => {
    const service = (controller as any).bookingsService;
    const req = { user: { id: 7, role: 'BOOKING_MANAGER' } };

    const result = await controller.sendPaymentRequest('101', req, true);
    expect(service.sendPaymentRequest).toHaveBeenCalledWith(101, 7, true);
    expect(result).toEqual({ success: true });
  });

  it('should call getPaymentQr with parsed id', async () => {
    const service = (controller as any).bookingsService;
    const result = await controller.getPaymentQr('101');
    expect(service.getPaymentQr).toHaveBeenCalledWith(101);
    expect(result).toEqual({ amount: 3000, upiUri: 'upi://pay...' });
  });
});
