import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from './authorization.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';

describe('AuthorizationService & Security Matrix Tests', () => {
  let service: AuthorizationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      rolePermission: {
        findMany: jest.fn(),
      },
      userPermission: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  describe('Test 10 & 11: Role Permissions Allowed / Denied', () => {
    it('should grant permission present in role', async () => {
      prisma.rolePermission.findMany.mockResolvedValue([
        { permission: { code: 'EMPLOYEE_READ' } },
        { permission: { code: 'EMPLOYEE_CREATE' } },
      ]);
      prisma.userPermission.findMany.mockResolvedValue([]);

      const perms = await service.calculateEffectivePermissions('user-1', 'role-1');
      expect(perms).toContain('EMPLOYEE_READ');
      expect(perms).toContain('EMPLOYEE_CREATE');
      expect(service.hasPermission(perms, 'EMPLOYEE_READ')).toBe(true);
      expect(service.hasPermission(perms, 'EMPLOYEE_DELETE')).toBe(false);
    });

    it('should allow Super Admin to bypass all permission checks', () => {
      expect(service.hasPermission([], 'ANY_UNKNOWN_PERMISSION', 'super-admin')).toBe(true);
    });
  });

  describe('Test 12: User Permission Override Precedence (Grant and Revoke)', () => {
    it('should explicitly REVOKE a permission granted by role when user override has isGranted: false', async () => {
      // Role grants EMPLOYEE_READ and EMPLOYEE_DELETE
      prisma.rolePermission.findMany.mockResolvedValue([
        { permission: { code: 'EMPLOYEE_READ' } },
        { permission: { code: 'EMPLOYEE_DELETE' } },
      ]);
      // User has explicit override revoking EMPLOYEE_DELETE
      prisma.userPermission.findMany.mockResolvedValue([
        { permission: { code: 'EMPLOYEE_DELETE' }, isGranted: false },
      ]);

      const perms = await service.calculateEffectivePermissions('user-1', 'role-1');
      expect(perms).toContain('EMPLOYEE_READ');
      expect(perms).not.toContain('EMPLOYEE_DELETE');
      expect(service.hasPermission(perms, 'EMPLOYEE_DELETE')).toBe(false);
    });

    it('should explicitly GRANT a permission not in role when user override has isGranted: true', async () => {
      // Role only grants CLIENT_READ
      prisma.rolePermission.findMany.mockResolvedValue([
        { permission: { code: 'CLIENT_READ' } },
      ]);
      // User has explicit override granting SALARY_APPROVE
      prisma.userPermission.findMany.mockResolvedValue([
        { permission: { code: 'SALARY_APPROVE' }, isGranted: true },
      ]);

      const perms = await service.calculateEffectivePermissions('user-1', 'role-1');
      expect(perms).toContain('CLIENT_READ');
      expect(perms).toContain('SALARY_APPROVE');
      expect(service.hasPermission(perms, 'SALARY_APPROVE')).toBe(true);
    });
  });

  describe('Test 13, 14 & 15: Branch Access & Cross-Agency / Cross-Branch Isolation', () => {
    const branchScopedUser: AuthenticatedUserContext = {
      id: 'user-trc',
      agencyId: 'agency-1',
      branchId: 'branch-trc',
      roleId: 'role-mgr',
      email: 'mgr@trc.com',
      fullName: 'Trichy Manager',
      roleSlug: 'branch-manager',
      effectivePermissions: ['EMPLOYEE_READ'],
    };

    const agencyWideUser: AuthenticatedUserContext = {
      id: 'user-admin',
      agencyId: 'agency-1',
      branchId: null, // Agency-wide
      roleId: 'role-admin',
      email: 'admin@agency.com',
      fullName: 'Super Admin',
      roleSlug: 'super-admin',
      effectivePermissions: ['*'],
    };

    it('should permit branch-scoped user accessing their own branch', () => {
      expect(() => service.validateBranchAccess(branchScopedUser, 'branch-trc')).not.toThrow();
    });

    it('should REJECT branch-scoped user attempting cross-branch access', () => {
      expect(() => service.validateBranchAccess(branchScopedUser, 'branch-chn')).toThrow(ForbiddenException);
    });

    it('should allow agency-wide user to access any branch', () => {
      expect(() => service.validateBranchAccess(agencyWideUser, 'branch-trc')).not.toThrow();
      expect(() => service.validateBranchAccess(agencyWideUser, 'branch-chn')).not.toThrow();
    });
  });

  describe('Test 16: Automated Tenant Filtering & IDOR Prevention', () => {
    it('should automatically inject agencyId and branchId to queries for branch-scoped user', () => {
      const branchUser: AuthenticatedUserContext = {
        id: 'user-1',
        agencyId: 'agency-alpha',
        branchId: 'branch-101',
        roleId: 'role-1',
        email: 'u@test.com',
        fullName: 'Test User',
        roleSlug: 'officer',
        effectivePermissions: [],
      };

      const query = service.applyTenantFilter(branchUser, { status: 'ACTIVE' });
      expect(query).toEqual({
        status: 'ACTIVE',
        agencyId: 'agency-alpha',
        branchId: 'branch-101',
      });
    });

    it('should inject agencyId only for agency-wide users', () => {
      const adminUser: AuthenticatedUserContext = {
        id: 'admin-1',
        agencyId: 'agency-alpha',
        branchId: null,
        roleId: 'role-admin',
        email: 'admin@test.com',
        fullName: 'Admin User',
        roleSlug: 'super-admin',
        effectivePermissions: [],
      };

      const query = service.applyTenantFilter(adminUser, { status: 'ACTIVE' });
      expect(query).toEqual({
        status: 'ACTIVE',
        agencyId: 'agency-alpha',
      });
      expect(query.branchId).toBeUndefined();
    });
  });
});
