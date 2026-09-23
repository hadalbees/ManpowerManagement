import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AuthenticatedUserContext } from '../../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  agencyId: string;
  branchId: string | null;
  roleId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authzService: AuthorizationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-jwt-token-key-change-in-production-2026',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUserContext> {
    if (!payload?.sub || !payload?.agencyId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_TOKEN_CLAIMS',
        message: 'Invalid token structure',
      });
    }

    // Verify user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User account not found',
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_SUSPENDED',
        message: 'User account is inactive or suspended',
      });
    }

    // Verify agency alignment
    if (user.agencyId !== payload.agencyId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_AGENCY_CONTEXT',
        message: 'Tenant identity mismatch',
      });
    }

    // Calculate effective permissions in real-time (incorporating user-level overrides)
    const effectivePermissions = await this.authzService.calculateEffectivePermissions(user.id, user.roleId);

    return {
      id: user.id,
      agencyId: user.agencyId,
      branchId: user.branchId,
      roleId: user.roleId,
      email: user.email,
      fullName: user.fullName,
      roleSlug: user.role.slug,
      effectivePermissions,
    };
  }
}
