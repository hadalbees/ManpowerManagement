import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUserContext } from '../decorators/current-user.decorator';
import { AuthorizationService } from '../../modules/authorization/authorization.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authzService: AuthorizationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permission decorator is present, allow access to authenticated user
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserContext;

    if (!user) {
      throw new ForbiddenException({
        code: 'AUTH_FORBIDDEN',
        message: 'Access denied: User is not authenticated',
      });
    }

    // Super Admin bypass
    if (user.roleSlug === 'super-admin') {
      return true;
    }

    // Verify all required permissions are met
    for (const required of requiredPermissions) {
      const allowed = this.authzService.hasPermission(
        user.effectivePermissions,
        required,
        user.roleSlug,
      );

      if (!allowed) {
        throw new ForbiddenException({
          code: 'AUTH_FORBIDDEN_PERMISSION_REQUIRED',
          message: `Access denied: Missing required permission [${required}]`,
          requiredPermission: required,
        });
      }
    }

    return true;
  }
}
