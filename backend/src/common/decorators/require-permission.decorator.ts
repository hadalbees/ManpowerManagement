import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Standard permission requirement decorator:
 * Usage:
 * @RequirePermission('EMPLOYEE', 'READ')
 * or
 * @RequirePermission('EMPLOYEE_READ')
 */
export const RequirePermission = (moduleOrCode: string, action?: string) => {
  const code = action ? `${moduleOrCode.toUpperCase()}_${action.toUpperCase()}` : moduleOrCode.toUpperCase();
  return SetMetadata(PERMISSIONS_KEY, [code]);
};

/**
 * Multiple permission requirements decorator (logical AND)
 */
export const RequirePermissions = (...permissions: string[]) => {
  return SetMetadata(PERMISSIONS_KEY, permissions.map(p => p.toUpperCase()));
};
