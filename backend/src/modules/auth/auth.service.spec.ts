import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

describe('AuthService Production Verification Tests (Tests 1 - 9)', () => {
  let authService: AuthService;
  let prisma: any;
  let jwtService: any;
  let auditService: any;
  let authzService: any;

  const mockHashedPassword = bcrypt.hashSync('Password@123', 10);
  const mockUser = {
    id: 'user-123',
    email: 'test@apexmanpower.in',
    passwordHash: mockHashedPassword,
    fullName: 'Test Employee',
    phone: '+91 94431 00000',
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lockedUntil: null,
    agencyId: 'agency-1',
    branchId: 'branch-1',
    roleId: 'role-1',
    role: { id: 'role-1', name: 'Officer', slug: 'officer' },
    agency: { id: 'agency-1', name: 'Apex Manpower', registrationNumber: 'CIN-123' },
    branch: { id: 'branch-1', branchName: 'Trichy HQ', branchCode: 'TRC' },
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-access-token'),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    authzService = {
      calculateEffectivePermissions: jest.fn().mockResolvedValue(['EMPLOYEE_READ', 'CLIENT_READ']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-jwt-secret'),
          },
        },
        { provide: AuthorizationService, useValue: authzService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('Test 1: Valid Login', () => {
    it('should authenticate user, reset failed attempts, return tokens and sanitized user info', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser });
      prisma.user.update.mockResolvedValue({ ...mockUser });
      prisma.userSession.create.mockResolvedValue({ id: 'session-1' });

      const result = await authService.login({
        email: 'test@apexmanpower.in',
        password: 'Password@123',
      });

      expect(result).toHaveProperty('accessToken', 'mocked-jwt-access-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@apexmanpower.in');
      expect((result.user as any).passwordHash).toBeUndefined(); // Zero password leak
      expect(result.user.effectivePermissions).toEqual(['EMPLOYEE_READ', 'CLIENT_READ']);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ changeSummary: 'User logged in successfully' }),
      );
    });
  });

  describe('Test 2: Invalid Password', () => {
    it('should reject invalid password, increment failed attempts, and log failure', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, failedLoginAttempts: 2 });
      prisma.user.update.mockResolvedValue({});

      await expect(
        authService.login({
          email: 'test@apexmanpower.in',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({ failedLoginAttempts: 3 }),
      });
    });
  });

  describe('Test 3: Unknown User', () => {
    it('should throw UnauthorizedException when email does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@apexmanpower.in',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Test 4: Account Lockout after 5 Failed Attempts', () => {
    it('should lock account for 15 minutes upon reaching 5 failed attempts', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, failedLoginAttempts: 4 });
      prisma.user.update.mockResolvedValue({});

      await expect(
        authService.login({
          email: 'test@apexmanpower.in',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it('should reject login immediately when account is currently locked', async () => {
      const lockedUser = {
        ...mockUser,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 mins remaining
      };
      prisma.user.findFirst.mockResolvedValue(lockedUser);

      await expect(
        authService.login({
          email: 'test@apexmanpower.in',
          password: 'Password@123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Test 5 & 6: Successful Refresh & Refresh Token Rotation', () => {
    it('should rotate refresh token: revokes old session and creates new session record', async () => {
      const rawOldToken = 'old-raw-refresh-token';
      const oldTokenHash = crypto.createHash('sha256').update(rawOldToken).digest('hex');

      prisma.userSession.findUnique.mockResolvedValue({
        id: 'session-old',
        userId: mockUser.id,
        refreshTokenHash: oldTokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: mockUser,
      });
      prisma.userSession.update.mockResolvedValue({});
      prisma.userSession.create.mockResolvedValue({ id: 'session-new' });

      const res = await authService.refresh({ refreshToken: rawOldToken });

      expect(res).toHaveProperty('accessToken');
      expect(res).toHaveProperty('refreshToken');
      expect(res.refreshToken).not.toBe(rawOldToken); // Rotated
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-old' },
        data: { isRevoked: true },
      });
      expect(prisma.userSession.create).toHaveBeenCalled();
    });
  });

  describe('Test 7: Logout', () => {
    it('should revoke session on logout', async () => {
      prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await authService.logout(mockUser.id, 'raw-token');
      expect(res.message).toBe('Logged out successfully');
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isRevoked: true } }),
      );
    });
  });

  describe('Test 8: Revoked Session Rejection & Token Reuse Detection', () => {
    it('should detect reuse of already revoked refresh token and revoke ALL user sessions', async () => {
      const stolenToken = 'stolen-revoked-token';
      const stolenHash = crypto.createHash('sha256').update(stolenToken).digest('hex');

      prisma.userSession.findUnique.mockResolvedValue({
        id: 'session-compromised',
        userId: mockUser.id,
        refreshTokenHash: stolenHash,
        isRevoked: true, // ALREADY REVOKED!
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: mockUser,
      });

      await expect(
        authService.refresh({ refreshToken: stolenToken }),
      ).rejects.toThrow(UnauthorizedException);

      // Security defense: Invalidate all active sessions for this compromised user
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  describe('Test 9: Password Change', () => {
    it('should verify current password, update hash, and invalidate all existing sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({});
      prisma.userSession.updateMany.mockResolvedValue({ count: 3 });

      const res = await authService.changePassword(mockUser.id, {
        currentPassword: 'Password@123',
        newPassword: 'BrandNewSecurePassword@2026',
      });

      expect(res.message).toContain('Password updated successfully');
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should reject password change if current password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.changePassword(mockUser.id, {
          currentPassword: 'IncorrectOldPassword',
          newPassword: 'BrandNewSecurePassword@2026',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
