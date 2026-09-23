import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUserContext } from '../decorators/current-user.decorator';
import { AuthorizationService } from '../../modules/authorization/authorization.service';

@Injectable()
export class AgencyBranchContextGuard implements CanActivate {
  constructor(private authzService: AuthorizationService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserContext;

    if (!user || !user.agencyId) {
      throw new ForbiddenException({
        code: 'AUTH_TENANT_CONTEXT_MISSING',
        message: 'Invalid request: Agency context could not be verified.',
      });
    }

    // Inspect if a specific branchId target is requested in params, query, or body
    const targetBranchId =
      request.params?.branchId ||
      request.query?.branchId ||
      request.headers?.['x-branch-id'];

    if (targetBranchId) {
      this.authzService.validateBranchAccess(user, targetBranchId);
    }

    return true;
  }
}
