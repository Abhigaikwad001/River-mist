import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let controller: AuditController;
  let service: AuditService;

  const mockAuditService = {
    getAuditLogs: jest.fn(),
    getAuditLogById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAuditLogs', () => {
    it('should call auditService.getAuditLogs with query params', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20 };
      mockAuditService.getAuditLogs.mockResolvedValue(mockResult);

      const query = { page: 1, limit: 20, entityType: 'PACKAGE' };
      const result = await controller.getAuditLogs(query as any);

      expect(service.getAuditLogs).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getAuditLogById', () => {
    it('should call auditService.getAuditLogById with numeric ID', async () => {
      const mockLog = { id: 5, action: 'UPDATE', entityType: 'FOOD' };
      mockAuditService.getAuditLogById.mockResolvedValue(mockLog);

      const result = await controller.getAuditLogById(5);

      expect(service.getAuditLogById).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockLog);
    });
  });
});
