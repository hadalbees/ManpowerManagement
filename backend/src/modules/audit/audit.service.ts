import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

export interface CreateAuditLogParams {
  agencyId: string;
  branchId?: string | null;
  userId?: string | null;
  entityName: string;
  entityId: string;
  action: AuditAction;
  changeSummary: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an immutable audit log entry.
   * Automatically sanitizes sensitive keys (passwords, tokens, credentials).
   */
  async record(params: CreateAuditLogParams): Promise<void> {
    try {
      const sanitizedOld = params.oldValues ? this.sanitize(params.oldValues) : null;
      const sanitizedNew = params.newValues ? this.sanitize(params.newValues) : null;

      await this.prisma.auditLog.create({
        data: {
          agencyId: params.agencyId,
          branchId: params.branchId || null,
          userId: params.userId || null,
          entityName: params.entityName,
          entityId: params.entityId,
          action: params.action,
          changeSummary: params.changeSummary,
          oldValues: sanitizedOld,
          newValues: sanitizedNew,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      // Audit log failures must never crash the primary business transaction, but should be alerted
      this.logger.error(`Failed to write audit log for ${params.entityName}:${params.entityId}`, error);
    }
  }

  /**
   * Redacts sensitive fields from audit snapshots
   */
  private sanitize(obj: Record<string, any>): Record<string, any> {
    const sensitiveKeys = [
      'password',
      'passwordhash',
      'password_hash',
      'refreshtoken',
      'refresh_token',
      'refreshtokenhash',
      'refresh_token_hash',
      'aadhaarencrypted',
      'aadhaar_encrypted',
      'bankaccountnoencrypted',
      'bank_account_no_encrypted',
      'panencrypted',
      'pan_encrypted',
    ];

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
