import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CapacityService } from '../capacity/capacity.service';
import { Role } from '@prisma/client';

describe('AdminController', () => {
  let controller: AdminController;
  let service: any;
  let capacityService: any;

  const mockAdminService = {
    getDashboardSummary: jest.fn(),
    getDashboardStats: jest.fn(),
    getRevenue: jest.fn(),
  };

  const mockCapacityService = {
    getCalendarReport: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: CapacityService, useValue: mockCapacityService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get(AdminService);
    capacityService = module.get(CapacityService);
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

  describe('getCalendar', () => {
    it('should delegate to capacityService.getCalendarReport', async () => {
      const mockReport = {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        report: [],
      };
      capacityService.getCalendarReport.mockResolvedValueOnce(mockReport);

      const res = await controller.getCalendar('2026-09-01', '2026-09-30');
      expect(capacityService.getCalendarReport).toHaveBeenCalledWith('2026-09-01', '2026-09-30');
      expect(res).toEqual(mockReport);
    });
  });
});
