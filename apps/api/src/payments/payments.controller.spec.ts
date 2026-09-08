import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createOrder: jest.fn(),
            verifyPayment: jest.fn(),
            handleWebhook: jest.fn(),
            recordManualPayment: jest.fn().mockResolvedValue({ success: true }),
            getAllPayments: jest.fn(),
            refundPayment: jest.fn().mockResolvedValue({ success: true }),
          }
        }
      ]
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should pass actor userId to recordManualPayment', async () => {
    const service = (controller as any).paymentsService;
    const req = { user: { id: 8, role: 'FINANCE_MANAGER' } };
    const body = {
      bookingId: 101,
      amount: 3000,
      method: 'UPI',
      referenceId: 'UPI-REF-123',
      notes: 'Verified in bank',
    };

    const res = await controller.recordManualPayment(req, body as any);
    expect(service.recordManualPayment).toHaveBeenCalledWith(
      101,
      3000,
      'UPI',
      'UPI-REF-123',
      'Verified in bank',
      8,
    );
    expect(res).toEqual({ success: true });
  });
});
