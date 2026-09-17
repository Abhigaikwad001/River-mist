import { Test, TestingModule } from '@nestjs/testing';
import { CapacityController } from './capacity.controller';
import { CapacityService } from './capacity.service';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@prisma/client';
import { BadRequestException, ExecutionContext } from '@nestjs/common';

describe('CapacityController (Phase 18B Overrides & Blackout Engine)', () => {
  let controller: CapacityController;
  let service: CapacityService;
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  const mockCapacityService = {
    getAvailabilityReport: jest.fn().mockResolvedValue({
      date: '2026-09-09',
      isClosed: false,
      resources: [],
    }),
    getDailyOverrides: jest.fn().mockResolvedValue([
      { id: 1, date: new Date('2026-09-08T18:30:00.000Z'), customCapacity: 300, isClosed: false },
    ]),
    setDailyOverride: jest.fn().mockImplementation((dto, userId) =>
      Promise.resolve({ id: 1, ...dto, userId })
    ),
    deleteDailyOverride: jest.fn().mockResolvedValue({ success: true, id: 1 }),
  };

  const createMockContext = (handler: Function, user?: { role: Role; id: number }): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => CapacityController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CapacityController],
      providers: [
        {
          provide: CapacityService,
          useValue: mockCapacityService,
        },
        Reflector,
        RolesGuard,
      ],
    }).compile();

    controller = module.get<CapacityController>(CapacityController);
    service = module.get<CapacityService>(CapacityService);
    reflector = module.get<Reflector>(Reflector);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('RBAC & Role Guards Metadata', () => {
    it('protects getAvailability with SUPER_ADMIN and BOOKING_MANAGER', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getAvailability);
      expect(roles).toEqual([Role.SUPER_ADMIN, Role.BOOKING_MANAGER]);
    });

    it('protects getOverrides with SUPER_ADMIN and BOOKING_MANAGER', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getOverrides);
      expect(roles).toEqual([Role.SUPER_ADMIN, Role.BOOKING_MANAGER]);
    });

    it('protects setOverride with SUPER_ADMIN and BOOKING_MANAGER', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.setOverride);
      expect(roles).toEqual([Role.SUPER_ADMIN, Role.BOOKING_MANAGER]);
    });

    it('protects deleteOverride with SUPER_ADMIN and BOOKING_MANAGER', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.deleteOverride);
      expect(roles).toEqual([Role.SUPER_ADMIN, Role.BOOKING_MANAGER]);
    });
  });

  describe('RBAC Authorization & Unauthorized Access Enforcement', () => {
    it('allows SUPER_ADMIN to execute setOverride', () => {
      const ctx = createMockContext(controller.setOverride, { role: Role.SUPER_ADMIN, id: 1 });
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('allows BOOKING_MANAGER to execute setOverride', () => {
      const ctx = createMockContext(controller.setOverride, { role: Role.BOOKING_MANAGER, id: 2 });
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('rejects regular USER from executing setOverride (unauthorized access)', () => {
      const ctx = createMockContext(controller.setOverride, { role: Role.USER, id: 3 });
      expect(rolesGuard.canActivate(ctx)).toBe(false);
    });

    it('rejects CONTENT_MANAGER from executing setOverride (unauthorized access)', () => {
      const ctx = createMockContext(controller.setOverride, { role: Role.CONTENT_MANAGER, id: 4 });
      expect(rolesGuard.canActivate(ctx)).toBe(false);
    });

    it('rejects FINANCE_MANAGER from deleting capacity overrides (unauthorized access)', () => {
      const ctx = createMockContext(controller.deleteOverride, { role: Role.FINANCE_MANAGER, id: 5 });
      expect(rolesGuard.canActivate(ctx)).toBe(false);
    });

    it('rejects unauthenticated requests (no user on request)', () => {
      const ctx = createMockContext(controller.setOverride, undefined);
      expect(rolesGuard.canActivate(ctx)).toBe(false);
    });
  });

  describe('Endpoint Operations & Input Validation', () => {
    it('getAvailability delegates to service with date', async () => {
      const result = await controller.getAvailability('2026-09-09');
      expect(service.getAvailabilityReport).toHaveBeenCalledWith('2026-09-09');
      expect(result.date).toBe('2026-09-09');
    });

    it('getAvailability throws BadRequestException when date is missing or empty', () => {
      expect(() => controller.getAvailability('')).toThrow(BadRequestException);
    });

    it('getOverrides delegates to service with start and end dates', async () => {
      const result = await controller.getOverrides('2026-09-01', '2026-09-30');
      expect(service.getDailyOverrides).toHaveBeenCalledWith('2026-09-01', '2026-09-30');
      expect(result).toHaveLength(1);
    });

    it('setOverride delegates to service passing DTO and user ID', async () => {
      const dto = { date: '2026-09-09', customCapacity: 400, isClosed: false };
      const req = { user: { id: 55 } };

      const result = await controller.setOverride(dto, req);
      expect(service.setDailyOverride).toHaveBeenCalledWith(dto, 55);
      expect(result.customCapacity).toBe(400);
    });

    it('deleteOverride delegates to service passing numeric ID and user ID', async () => {
      const req = { user: { id: 55 } };
      const result = await controller.deleteOverride('1', req);
      expect(service.deleteDailyOverride).toHaveBeenCalledWith(1, 55);
      expect(result).toEqual({ success: true, id: 1 });
    });

    it('deleteOverride throws BadRequestException for non-numeric or invalid ID string', () => {
      const req = { user: { id: 55 } };
      expect(() => controller.deleteOverride('abc', req)).toThrow(BadRequestException);
      expect(() => controller.deleteOverride('-5', req)).toThrow(BadRequestException);
      expect(() => controller.deleteOverride('0', req)).toThrow(BadRequestException);
    });
  });
});
