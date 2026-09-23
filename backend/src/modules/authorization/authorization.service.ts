import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates the exact effective permissions for a user taking into account:
   * 1. Default permissions granted by their primary role.
   * 2. User-specific permission overrides (explicit grants and explicit revokes).
   * 
   * Precedence:
   * User Override (isGranted: true/false) > Role Permission > Denied by Default.
   */
  async calculateEffectivePermissions(userId: string, roleId: string): Promise<string[]> {
    // 1. Fetch Role Permissions
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });

    const permissionSet = new Set<string>();
    for (const rp of rolePermissions) {
      if (rp.permission?.code) {
        permissionSet.add(rp.permission.code.toUpperCase());
      }
    }

    // 2. Fetch User-Level Overrides
    const userOverrides = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    for (const override of userOverrides) {
      const code = override.permission?.code?.toUpperCase();
      if (!code) continue;

      if (override.isGranted) {
        // Explicit user grant
        permissionSet.add(code);
      } else {
        // Explicit user revoke/denial overrides role permission
        permissionSet.delete(code);
      }
    }

    return Array.from(permissionSet);
  }

  /**
   * Verifies if the effective permissions satisfy the required permission
   */
  hasPermission(effectivePermissions: string[], requiredPermission: string, roleSlug?: string): boolean {
    // Super-admin role bypasses granular checks
    if (roleSlug === 'super-admin') {
      return true;
    }

    const normalizedReq = requiredPermission.toUpperCase();
    return effectivePermissions.includes(normalizedReq);
  }

  /**
   * Enforces branch-level data access boundary
   * If a user is branch-restricted, they cannot access a different branch within the agency.
   * If a user is agency-wide (branchId is null), they can access all branches in their agency.
   */
  validateBranchAccess(user: AuthenticatedUserContext, targetBranchId: string | null | undefined): void {
    if (!targetBranchId) return;

    // If user is restricted to a specific branch, target must match
    if (user.branchId && user.branchId !== targetBranchId) {
      throw new ForbiddenException({
        code: 'AUTH_FORBIDDEN_BRANCH_ACCESS',
        message: 'Access denied: You do not have authorization to access this branch.',
      });
    }
  }

  /**
   * Automatically applies agency and branch tenant filters to Prisma query objects.
   * Prevents Insecure Direct Object References (IDOR).
   */
  applyTenantFilter<T extends Record<string, any>>(user: AuthenticatedUserContext, filter: T = {} as T): T {
    const tenantFilter: Record<string, any> = {
      agencyId: user.agencyId,
    };

    // If user is branch-scoped, strictly enforce branch filtering
    if (user.branchId) {
      tenantFilter.branchId = user.branchId;
    }

    return {
      ...filter,
      ...tenantFilter,
    };
  }
}
