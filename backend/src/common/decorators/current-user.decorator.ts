import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUserContext {
  id: string;
  agencyId: string;
  branchId: string | null;
  roleId: string;
  email: string;
  fullName: string;
  roleSlug: string;
  effectivePermissions: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUserContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserContext;
    return data ? user?.[data] : user;
  },
);
