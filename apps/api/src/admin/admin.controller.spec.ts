import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Role } from '@prisma/client';

describe('AdminController', () => {
  let controller: AdminController;
  let service: any;

  const mockAdminService = {
    getDashboardSummary: jest.fn(),
    getDashboardStats: jest.fn(),
    getRevenue: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardSummary', () => {
    it('should delegate to adminService.getDashboardSummary passing user role', async () => {
      const mockSummary = {
        timestamp: '2026-09-09T11:00:00.000Z',
        attentionRequired: { totalActionItems: 3 },
      };
      service.getDashboardSummary.mockResolvedValueOnce(mockSummary);

      const req = { user: { id: 1, role: Role.SUPER_ADMIN } };
      const res = await controller.getDashboardSummary(req);

      expect(service.getDashboardSummary).toHaveBeenCalledWith(Role.SUPER_ADMIN);
      expect(res).toEqual(mockSummary);
    });
  });

  describe('getDashboardStats (legacy)', () => {
    it('should delegate to adminService.getDashboardStats', async () => {
      const mockStats = { totalBookings: 10, totalRevenue: 15000 };
      service.getDashboardStats.mockResolvedValueOnce(mockStats);

      const res = await controller.getDashboardStats();
      expect(service.getDashboardStats).toHaveBeenCalled();
      expect(res).toEqual(mockStats);
    });
  });

  describe('getRevenue (legacy)', () => {
    it('should delegate to adminService.getRevenue', async () => {
      const mockRev = [{ id: 1, amount: 5000 }];
      service.getRevenue.mockResolvedValueOnce(mockRev);

      const res = await controller.getRevenue();
      expect(service.getRevenue).toHaveBeenCalled();
      expect(res).toEqual(mockRev);
    });
  });
});
