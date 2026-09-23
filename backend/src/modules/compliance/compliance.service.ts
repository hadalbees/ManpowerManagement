import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  ComplianceQueryDto,
  ComplianceExpiryStatus,
  AcknowledgeAlertDto,
} from './dto/compliance.dto';
import {
  ExpiryAlertStatus,
  NotificationCategory,
  NotificationPriority,
  AuditAction,
} from '@prisma/client';

@Injectable()
export class ComplianceService {
  private readonly defaultThresholds = [60, 30, 15, 7, 0];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Evaluates current date in Asia/Kolkata timezone (UTC+05:30)
   */
  getTodayKolkata(): Date {
    const now = new Date();
    // Offset for Asia/Kolkata is +5 hours 30 minutes
    const kolkataTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return new Date(Date.UTC(kolkataTime.getUTCFullYear(), kolkataTime.getUTCMonth(), kolkataTime.getUTCDate()));
  }

  /**
   * Calculates days remaining until expiration relative to Asia/Kolkata calendar day
   */
  calculateDaysRemaining(expiryDate: Date): number {
    const today = this.getTodayKolkata();
    const exp = new Date(expiryDate);
    const expDateOnly = new Date(Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate()));
    const diffMs = expDateOnly.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Returns executive compliance KPI metrics and summary breakdown
   */
  async getComplianceDashboard(user: AuthenticatedUserContext, branchId?: string) {
    const agencyId = user.agencyId;
    const targetBranch = user.branchId || branchId;

    const where: any = {
      agencyId,
      deletedAt: null,
    };
    if (targetBranch) {
      where.OR = [{ branchId: targetBranch }, { branchId: null }];
    }

    const documents = await this.prisma.document.findMany({
      where,
      include: { documentType: true },
    });

    let total = documents.length;
    let validCount = 0;
    let expiringSoonCount = 0; // <= 30 days
    let expiredCount = 0;
    let notApplicableCount = 0;
    let pendingVerificationCount = 0;

    for (const doc of documents) {
      if (doc.verificationStatus === 'PENDING') {
        pendingVerificationCount++;
      }

      if (!doc.expiryDate) {
        notApplicableCount++;
        continue;
      }

      const days = this.calculateDaysRemaining(doc.expiryDate);
      if (days < 0) {
        expiredCount++;
      } else if (days <= 30) {
        expiringSoonCount++;
      } else {
        validCount++;
      }
    }

    const trackedWithExpiry = validCount + expiringSoonCount + expiredCount;
    const compliancePercentage =
      trackedWithExpiry > 0 ? Number(((validCount / trackedWithExpiry) * 100).toFixed(1)) : 100.0;

    return {
      totalDocuments: total,
      trackedWithExpiry,
      validCount,
      expiringSoonCount,
      expiredCount,
      notApplicableCount,
      pendingVerificationCount,
      compliancePercentage,
    };
  }

  /**
   * Core Idempotent Expiry Processing Job:
   * 1. Scans documents with expiryDate
   * 2. Checks thresholds (60, 30, 15, 7, 0 days)
   * 3. Prevents duplicate alerts via unique (documentId, alertThresholdDays)
   * 4. Dispatches in-app notifications
   */
  async processExpiryAlerts(agencyId: string, systemUser?: AuthenticatedUserContext) {
    const today = this.getTodayKolkata();
    const documents = await this.prisma.document.findMany({
      where: {
        agencyId,
        expiryDate: { not: null },
        deletedAt: null,
      },
      include: {
        documentType: true,
        agency: true,
      },
    });

    let createdAlerts = 0;

    for (const doc of documents) {
      if (!doc.expiryDate) continue;

      const daysRemaining = this.calculateDaysRemaining(doc.expiryDate);
      const thresholds = doc.documentType?.defaultAlertDays?.length
        ? doc.documentType.defaultAlertDays
        : this.defaultThresholds;

      for (const threshold of thresholds) {
        if (daysRemaining <= threshold) {
          // Check if this threshold alert was already emitted
          const existingAlert = await this.prisma.expiryAlert.findUnique({
            where: {
              documentId_alertThresholdDays: {
                documentId: doc.id,
                alertThresholdDays: threshold,
              },
            },
          });

          if (!existingAlert) {
            // Determine priority
            let priority: NotificationPriority = NotificationPriority.NORMAL;
            if (daysRemaining <= 0) priority = NotificationPriority.CRITICAL;
            else if (daysRemaining <= 7) priority = NotificationPriority.HIGH;
            else if (daysRemaining <= 30) priority = NotificationPriority.NORMAL;
            else priority = NotificationPriority.LOW;

            const alertTitle =
              daysRemaining <= 0
                ? `EXPIRED: ${doc.title || doc.documentType.name} has expired`
                : `EXPIRING SOON: ${doc.title || doc.documentType.name} expires in ${daysRemaining} days`;

            const alertBody = `Document ${doc.originalFileName} (${doc.documentNumber || 'No #'}) for ${doc.entityType} ${doc.entityId} expires on ${doc.expiryDate.toISOString().split('T')[0]}. Action required.`;

            await this.prisma.$transaction(async (tx) => {
              // Create ExpiryAlert record
              await tx.expiryAlert.create({
                data: {
                  agencyId,
                  documentId: doc.id,
                  entityType: doc.entityType,
                  entityId: doc.entityId,
                  expiryDate: doc.expiryDate!,
                  alertThresholdDays: threshold,
                  scheduledAlertDate: today,
                  status: ExpiryAlertStatus.SENT,
                  sentAt: new Date(),
                },
              });

              // Also create user notification if user exists
              if (doc.uploadedById) {
                const dedupKey = `EXPIRY:${doc.id}:${threshold}`;
                await tx.notification.upsert({
                  where: { dedupKey },
                  update: {},
                  create: {
                    agencyId,
                    userId: doc.uploadedById,
                    branchId: doc.branchId,
                    title: alertTitle,
                    body: alertBody,
                    category: NotificationCategory.EXPIRY,
                    priority,
                    actionUrl: `/dashboard/documents`,
                    referenceType: 'Document',
                    referenceId: doc.id,
                    dedupKey,
                  },
                });
              }
            });

            createdAlerts++;

            await this.auditService.record({
              agencyId,
              branchId: doc.branchId,
              userId: systemUser?.id || doc.uploadedById || 'SYSTEM',
              entityName: 'Document',
              entityId: doc.id,
              action: AuditAction.UPDATE,
              changeSummary: `COMPLIANCE_ALERT_CREATED: Emitted ${threshold}-day expiry alert for ${doc.title || doc.documentType.name}`,
            });
          }
        }
      }
    }

    return {
      processedDocuments: documents.length,
      createdAlerts,
    };
  }

  /**
   * Queries documents with compliance status filtering
   */
  async getComplianceDocuments(query: ComplianceQueryDto, user: AuthenticatedUserContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId: user.agencyId,
      deletedAt: null,
      expiryDate: { not: null },
    };

    if (user.branchId) {
      where.OR = [{ branchId: user.branchId }, { branchId: null }];
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.entityType) where.entityType = query.entityType;

    const docs = await this.prisma.document.findMany({
      where,
      include: {
        documentType: true,
        alerts: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { expiryDate: 'asc' },
    });

    // Filter by calculated status
    const annotated = docs
      .map((doc) => {
        const daysRemaining = this.calculateDaysRemaining(doc.expiryDate!);
        let status = ComplianceExpiryStatus.VALID;
        if (daysRemaining < 0) status = ComplianceExpiryStatus.EXPIRED;
        else if (daysRemaining <= 30) status = ComplianceExpiryStatus.EXPIRING_SOON;

        return {
          ...doc,
          daysRemaining,
          complianceStatus: status,
        };
      })
      .filter((doc) => {
        if (query.status && doc.complianceStatus !== query.status) return false;
        if (query.withinDays !== undefined && doc.daysRemaining > query.withinDays) return false;
        return true;
      });

    const total = annotated.length;
    const paged = annotated.slice(skip, skip + limit);

    return {
      items: paged,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Acknowledges an active compliance expiry alert
   */
  async acknowledgeAlert(alertId: string, dto: AcknowledgeAlertDto, user: AuthenticatedUserContext) {
    const alert = await this.prisma.expiryAlert.findUnique({
      where: { id: alertId },
      include: { document: true },
    });

    if (!alert || alert.agencyId !== user.agencyId) {
      throw new NotFoundException('Expiry alert not found');
    }

    const updated = await this.prisma.expiryAlert.update({
      where: { id: alertId },
      data: {
        status: ExpiryAlertStatus.ACKNOWLEDGED,
        acknowledgedById: user.id,
        acknowledgedAt: new Date(),
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: alert.document.branchId,
      userId: user.id,
      entityName: 'ExpiryAlert',
      entityId: alert.id,
      action: AuditAction.APPROVE,
      changeSummary: `ALERT_ACKNOWLEDGED: Acknowledged ${alert.alertThresholdDays}-day expiry alert for document ${alert.document.title || alert.document.id}`,
    });

    return updated;
  }
}
