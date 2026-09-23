import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
// import * as bcrypt from 'bcrypt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authzService: AuthorizationService,
    private readonly auditService: AuditService,
  ) { }

  /**
   * Secure User Authentication
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto;

    // 1. Locate user by email
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
      },
      include: {
        agency: true,
        branch: true,
        role: true,
      },
    });

    if (!user) {
      this.logger.warn(`Failed login attempt for non-existent email: ${email}`);
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // 2. Check Account Lockout status
    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      this.logger.warn(`Login rejected: Account locked for user ${user.id} (${remainingMinutes}m remaining)`);
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_LOCKED',
        message: `Account is temporarily locked due to consecutive failed attempts. Please retry in ${remainingMinutes} minutes.`,
      });
    }

    // If lockout duration has elapsed, reset counter
    if (user.lockedUntil && user.lockedUntil <= now) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    // 3. Check Account Active Status
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_INACTIVE',
        message: 'Your account is deactivated or suspended. Please contact your agency administrator.',
      });
    }

    // 4. Verify Password Hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const updatedFailedAttempts = user.failedLoginAttempts + 1;
      let newLockedUntil: Date | null = null;

      if (updatedFailedAttempts >= 5) {
        // Lock for 15 minutes
        newLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        this.logger.warn(`Account locked for user ${user.id} after 5 failed attempts`);

        await this.auditService.record({
          agencyId: user.agencyId,
          branchId: user.branchId,
          userId: user.id,
          entityName: 'User',
          entityId: user.id,
          action: AuditAction.LOCK,
          changeSummary: 'Account locked for 15 minutes due to 5 consecutive failed login attempts',
          ipAddress,
          userAgent,
        });
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: updatedFailedAttempts,
          lockedUntil: newLockedUntil,
        },
      });

      await this.auditService.record({
        agencyId: user.agencyId,
        branchId: user.branchId,
        userId: user.id,
        entityName: 'User',
        entityId: user.id,
        action: AuditAction.UPDATE,
        changeSummary: `Failed login attempt (${updatedFailedAttempts}/5)`,
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException({
        code: updatedFailedAttempts >= 5 ? 'AUTH_ACCOUNT_LOCKED' : 'AUTH_INVALID_CREDENTIALS',
        message: updatedFailedAttempts >= 5
          ? 'Account locked for 15 minutes due to multiple failed login attempts.'
          : 'Invalid email or password',
      });
    }

    // 5. Successful Login: Reset attempts and update timestamps
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
        lastLoginIp: ipAddress || null,
      },
    });

    // 6. Generate Short-Lived Access Token (15m)
    const payload = {
      sub: user.id,
      agencyId: user.agencyId,
      branchId: user.branchId,
      roleId: user.roleId,
    };
    const accessToken = this.jwtService.sign(payload);

    // 7. Generate Opaque Refresh Token and store SHA-256 hash in database
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        expiresAt: refreshExpiresAt,
        isRevoked: false,
      },
    });

    // 8. Record LOGIN_SUCCESS audit log
    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: user.branchId,
      userId: user.id,
      entityName: 'UserSession',
      entityId: user.id,
      action: AuditAction.CREATE,
      changeSummary: 'User logged in successfully',
      ipAddress,
      userAgent,
    });

    // 9. Calculate Effective Permissions
    const effectivePermissions = await this.authzService.calculateEffectivePermissions(
      user.id,
      user.roleId,
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: {
          id: user.role.id,
          name: user.role.name,
          slug: user.role.slug,
        },
        agency: {
          id: user.agency.id,
          name: user.agency.name,
          registrationNumber: user.agency.registrationNumber,
        },
        branch: user.branch
          ? {
            id: user.branch.id,
            name: user.branch.branchName,
            code: user.branch.branchCode,
          }
          : null,
        effectivePermissions,
      },
    };
  }

  /**
   * Refresh Token Rotation with Token Reuse Detection
   */
  async refresh(refreshTokenDto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const { refreshToken } = refreshTokenDto;

    // Hash the token to look up stored record
    const incomingTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: incomingTokenHash },
      include: {
        user: {
          include: {
            agency: true,
            branch: true,
            role: true,
          },
        },
      },
    });

    // If session does not exist
    if (!session) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired session',
      });
    }

    // Token Reuse Detection: If session is already revoked, potential security breach!
    if (session.isRevoked) {
      this.logger.warn(`Security Alert: Revoked refresh token reuse detected for user ${session.userId}! Revoking all sessions.`);

      // Revoke ALL active sessions for this user
      await this.prisma.userSession.updateMany({
        where: { userId: session.userId, isRevoked: false },
        data: { isRevoked: true },
      });

      await this.auditService.record({
        agencyId: session.user.agencyId,
        branchId: session.user.branchId,
        userId: session.userId,
        entityName: 'UserSession',
        entityId: session.id,
        action: AuditAction.LOCK,
        changeSummary: 'Security Alert: Token reuse detected. All active sessions terminated.',
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_TOKEN_REUSE_DETECTED',
        message: 'Security alert: Refresh token was already used. All sessions have been revoked for your safety.',
      });
    }

    // Check expiry
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_TOKEN_EXPIRED',
        message: 'Session has expired. Please log in again.',
      });
    }

    const user = session.user;
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_INACTIVE',
        message: 'User account is inactive or disabled',
      });
    }

    // Rotate token: 1. Revoke the old session
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // 2. Generate new refresh token
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: newRefreshTokenHash,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        expiresAt: newExpiresAt,
        isRevoked: false,
      },
    });

    // 3. Generate new access token
    const newAccessToken = this.jwtService.sign({
      sub: user.id,
      agencyId: user.agencyId,
      branchId: user.branchId,
      roleId: user.roleId,
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: user.branchId,
      userId: user.id,
      entityName: 'UserSession',
      entityId: session.id,
      action: AuditAction.UPDATE,
      changeSummary: 'Refresh token rotated successfully',
      ipAddress,
      userAgent,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  /**
   * User Logout / Session Revocation
   */
  async logout(userId: string, rawRefreshToken?: string, ipAddress?: string, userAgent?: string) {
    if (rawRefreshToken) {
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      await this.prisma.userSession.updateMany({
        where: { userId, refreshTokenHash: tokenHash },
        data: { isRevoked: true },
      });
    } else {
      // Revoke all active sessions for this user
      await this.prisma.userSession.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.auditService.record({
        agencyId: user.agencyId,
        branchId: user.branchId,
        userId: user.id,
        entityName: 'UserSession',
        entityId: user.id,
        action: AuditAction.UPDATE,
        changeSummary: 'User logged out and session revoked',
        ipAddress,
        userAgent,
      });
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Password Change with Session Invalidation
   */
  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException({
        code: 'AUTH_CURRENT_PASSWORD_INCORRECT',
        message: 'The current password provided is incorrect',
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Invalidate all existing sessions so old tokens cannot be used
    await this.prisma.userSession.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: user.branchId,
      userId: user.id,
      entityName: 'User',
      entityId: user.id,
      action: AuditAction.UPDATE,
      changeSummary: 'Password changed successfully. All previous sessions invalidated.',
      ipAddress,
      userAgent,
    });

    return { message: 'Password updated successfully. Please log in again.' };
  }

  /**
   * Retrieve Current Authenticated User Profile
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agency: true,
        branch: true,
        role: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User profile not found',
      });
    }

    const effectivePermissions = await this.authzService.calculateEffectivePermissions(
      user.id,
      user.roleId,
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: {
        id: user.role.id,
        name: user.role.name,
        slug: user.role.slug,
      },
      agency: {
        id: user.agency.id,
        name: user.agency.name,
        registrationNumber: user.agency.registrationNumber,
      },
      branch: user.branch
        ? {
          id: user.branch.id,
          name: user.branch.branchName,
          code: user.branch.branchCode,
        }
        : null,
      effectivePermissions,
    };
  }
}
