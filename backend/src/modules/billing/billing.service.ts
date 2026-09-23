import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  InvoiceStatus,
  InvoiceAdjustmentType,
  PaymentMode,
  BillingModel,
  AuditAction,
  AttendanceStatus,
} from '@prisma/client';
import {
  GenerateInvoiceDto,
  UpdateInvoiceDto,
  CreateInvoiceAdjustmentDto,
  RecordClientPaymentDto,
  InvoiceQueryDto,
  PaymentQueryDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private getFinancialYear(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    if (month >= 4) {
      const nextYear = (year + 1).toString().slice(-2);
      return `${year}-${nextYear}`;
    } else {
      const prevYear = year - 1;
      const curYear = year.toString().slice(-2);
      return `${prevYear}-${curYear}`;
    }
  }

  /**
   * Resolves configured GST tax rates considering agency, branch state, client state, and effective date.
   * Rates are resolved dynamically from configured tax rules (AgencyConfiguration) or standard statutory GST rules.
   */
  async resolveTaxRule(
    agencyId: string,
    branchStateCode: string,
    clientStateCode: string,
    businessDate: Date,
    tx?: any,
  ): Promise<{
    isInterstate: boolean;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    ruleCode: string;
    effectiveFrom: string;
    source: string;
  }> {
    const isInterstate = branchStateCode !== clientStateCode;
    const clientPrisma = tx || this.prisma;

    // Check if agency has configured tax rules in AgencyConfiguration
    try {
      const config = await clientPrisma.agencyConfiguration.findFirst({
        where: {
          agencyId,
          configKey: 'GST_TAX_RULES',
        },
      });

      if (config && config.configValue) {
        const val = config.configValue as any;
        const rules = Array.isArray(val.rules) ? val.rules : [val];
        const matchingRule = rules.find((r: any) => {
          const from = new Date(r.effectiveFrom || '2017-07-01');
          const to = r.effectiveTo ? new Date(r.effectiveTo) : null;
          return businessDate >= from && (!to || businessDate <= to);
        });

        if (matchingRule) {
          if (!isInterstate) {
            const cgst = Number(matchingRule.intraState?.cgstRate ?? matchingRule.cgstRate ?? 9.0);
            const sgst = Number(matchingRule.intraState?.sgstRate ?? matchingRule.sgstRate ?? 9.0);
            return {
              isInterstate: false,
              cgstRate: cgst,
              sgstRate: sgst,
              igstRate: 0.0,
              ruleCode: matchingRule.ruleCode || 'CONFIGURED_GST_INTRA',
              effectiveFrom: matchingRule.effectiveFrom || '2017-07-01',
              source: 'AGENCY_CONFIGURATION',
            };
          } else {
            const igst = Number(matchingRule.interState?.igstRate ?? matchingRule.igstRate ?? 18.0);
            return {
              isInterstate: true,
              cgstRate: 0.0,
              sgstRate: 0.0,
              igstRate: igst,
              ruleCode: matchingRule.ruleCode || 'CONFIGURED_GST_INTER',
              effectiveFrom: matchingRule.effectiveFrom || '2017-07-01',
              source: 'AGENCY_CONFIGURATION',
            };
          }
        }
      }
    } catch {
      // Fall through to statutory standard
    }

    // Standard Versioned Statutory GST Rule (SAC 9985: Security & Facility Support Services)
    // Effective from 01-Jul-2017 (GST rollout in India)
    if (!isInterstate) {
      return {
        isInterstate: false,
        cgstRate: 9.0,
        sgstRate: 9.0,
        igstRate: 0.0,
        ruleCode: 'STATUTORY_GST_SAC9985_INTRA',
        effectiveFrom: '2017-07-01',
        source: 'STATUTORY_STANDARD',
      };
    } else {
      return {
        isInterstate: true,
        cgstRate: 0.0,
        sgstRate: 0.0,
        igstRate: 18.0,
        ruleCode: 'STATUTORY_GST_SAC9985_INTER',
        effectiveFrom: '2017-07-01',
        source: 'STATUTORY_STANDARD',
      };
    }
  }

  // ==========================================
  // 1. GENERATE CLIENT INVOICE
  // ==========================================

  async generateInvoice(dto: GenerateInvoiceDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || dto.branchId;

    if (user.branchId && user.branchId !== dto.branchId) {
      throw new ForbiddenException('Cannot generate invoice for a different branch');
    }

    const [client, branch] = await Promise.all([
      this.prisma.client.findFirst({
        where: { id: dto.clientId, agencyId, deletedAt: null },
      }),
      this.prisma.agencyBranch.findFirst({
        where: { id: branchId, agencyId, deletedAt: null },
      }),
    ]);

    if (!client) {
      throw new NotFoundException('Client not found or unauthorized');
    }
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const startDateObj = new Date(dto.billingPeriodStart);
    const endDateObj = new Date(dto.billingPeriodEnd);

    if (endDateObj < startDateObj) {
      throw new BadRequestException('billingPeriodEnd cannot be earlier than billingPeriodStart');
    }

    const financialYear = this.getFinancialYear(new Date());

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate sequential invoice number atomically
      const seqRecord = await tx.invoiceSequence.upsert({
        where: {
          branchId_financialYear_documentType: {
            branchId,
            financialYear,
            documentType: 'INV',
          },
        },
        update: {
          lastSequence: { increment: 1 },
        },
        create: {
          agencyId,
          branchId,
          financialYear,
          documentType: 'INV',
          lastSequence: 1,
        },
      });

      const seqStr = seqRecord.lastSequence.toString().padStart(4, '0');
      const invoiceNumber = `${branch.branchCode}/INV/${financialYear}/${seqStr}`;

      // 2. Fetch deployments and billable attendance for client
      const deployments = await tx.employeeDeployment.findMany({
        where: {
          clientId: client.id,
          agencyId,
          deletedAt: null,
          startDate: { lte: endDateObj },
          OR: [{ endDate: null }, { endDate: { gte: startDateObj } }],
        },
        include: {
          clientSite: true,
          designation: true,
          billingRate: true,
        },
      });

      let subtotalAmount = 0.0;
      const invoiceItemsData: any[] = [];

      for (const dep of deployments) {
        const rate = dep.billingRate;
        if (!rate || !rate.isActive) continue;

        // Query shift attendance within billing window
        const attendances = await tx.attendance.findMany({
          where: {
            deploymentId: dep.id,
            shiftBusinessDate: { gte: startDateObj, lte: endDateObj },
          },
        });

        let billableUnits = 0.0;
        let billableOtHours = 0.0;

        if (rate.billingModel === BillingModel.MONTHLY_FIXED) {
          billableUnits = 1.0;
        } else if (
          rate.billingModel === BillingModel.PER_EMPLOYEE_PER_SHIFT
        ) {
          for (const att of attendances) {
            if (att.status === AttendanceStatus.PRESENT) billableUnits += 1.0;
            else if (att.status === AttendanceStatus.HALF_DAY) billableUnits += 0.5;
            billableOtHours += Number(att.overtimeHours);
          }
        } else if (rate.billingModel === BillingModel.HOURLY) {
          for (const att of attendances) {
            if (att.status === AttendanceStatus.PRESENT || att.status === AttendanceStatus.HALF_DAY) {
              billableUnits += Number(att.workedHours);
            }
            billableOtHours += Number(att.overtimeHours);
          }
        } else if (rate.billingModel === BillingModel.OVERTIME) {
          for (const att of attendances) {
            billableUnits += Number(att.overtimeHours);
          }
        }

        const rateApplied = Number(rate.rateAmount);
        const otRateApplied = Number(rate.otHourlyRate || 0);

        const baseTotal = Number((billableUnits * rateApplied).toFixed(2));
        const otTotal = Number((billableOtHours * otRateApplied).toFixed(2));
        const lineTotal = Number((baseTotal + otTotal).toFixed(2));

        if (lineTotal > 0 || billableUnits > 0) {
          subtotalAmount += lineTotal;
          invoiceItemsData.push({
            clientSiteId: dep.clientSiteId,
            designationId: dep.designationId,
            billingRateId: dep.billingRateId,
            description: `${dep.designation.name} at ${dep.clientSite.siteName} (${rate.billingModel})`,
            billingModel: rate.billingModel,
            quantityShiftsOrHours: billableUnits,
            rateApplied,
            overtimeHours: billableOtHours,
            overtimeRate: otRateApplied,
            lineTotal,
          });
        }
      }

      // 3. Tax / GST Calculations resolved via authoritative configurable/versioned rule
      const invoiceDateObj = new Date();
      const taxRule = await this.resolveTaxRule(
        agencyId,
        branch.stateCode,
        client.stateCode,
        invoiceDateObj,
        tx,
      );

      const isInterstate = taxRule.isInterstate;
      const cgstRate = taxRule.cgstRate;
      const sgstRate = taxRule.sgstRate;
      const igstRate = taxRule.igstRate;

      let cgstAmount = 0.0;
      let sgstAmount = 0.0;
      let igstAmount = 0.0;

      if (!isInterstate) {
        cgstAmount = Number(((subtotalAmount * cgstRate) / 100).toFixed(2));
        sgstAmount = Number(((subtotalAmount * sgstRate) / 100).toFixed(2));
      } else {
        igstAmount = Number(((subtotalAmount * igstRate) / 100).toFixed(2));
      }

      const totalTaxAmount = Number((cgstAmount + sgstAmount + igstAmount).toFixed(2));
      const rawTotal = subtotalAmount + totalTaxAmount;
      const totalInvoiceAmount = Number(rawTotal.toFixed(2));
      const roundOff = Number((Math.round(totalInvoiceAmount) - totalInvoiceAmount).toFixed(2));
      const finalInvoiceAmount = Number((totalInvoiceAmount + roundOff).toFixed(2));

      // 4. Create ClientInvoice
      const invoice = await tx.clientInvoice.create({
        data: {
          agencyId,
          branchId,
          clientId: client.id,
          contractId: dto.contractId,
          invoiceNumber,
          invoiceDate: new Date(),
          dueDate: new Date(dto.dueDate),
          billingPeriodStart: startDateObj,
          billingPeriodEnd: endDateObj,
          subtotalAmount: Number(subtotalAmount.toFixed(2)),
          isInterstate,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          totalTaxAmount,
          roundOff,
          totalInvoiceAmount: finalInvoiceAmount,
          paidAmount: 0.0,
          creditAdjustmentAmount: 0.0,
          balanceDue: finalInvoiceAmount,
          status: InvoiceStatus.DRAFT,
          items: {
            create: invoiceItemsData,
          },
        },
        include: {
          client: true,
          branch: true,
          items: {
            include: { clientSite: true, designation: true },
          },
        },
      });

      await this.auditService.record({
        agencyId,
        branchId,
        userId: user.id,
        entityName: 'ClientInvoice',
        entityId: invoice.id,
        action: AuditAction.CREATE,
        changeSummary: `INVOICE_CREATED: Generated invoice ${invoiceNumber} for ${client.companyName} totaling ₹${finalInvoiceAmount}`,
        newValues: {
          invoiceNumber,
          subtotalAmount,
          totalInvoiceAmount: finalInvoiceAmount,
          taxRuleSnapshot: {
            ruleCode: taxRule.ruleCode,
            source: taxRule.source,
            effectiveFrom: taxRule.effectiveFrom,
            isInterstate,
            cgstRate,
            sgstRate,
            igstRate,
            cgstAmount,
            sgstAmount,
            igstAmount,
            totalTaxAmount,
          },
        },
      });

      return invoice;
    });
  }

  // ==========================================
  // 2. QUERY & GET INVOICES
  // ==========================================

  async getInvoices(query: InvoiceQueryDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || query.branchId;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId,
      ...(branchId ? { branchId } : {}),
      deletedAt: null,
    };

    if (query.clientId) where.clientId = query.clientId;
    if (query.status) where.status = query.status;

    if (query.periodStart || query.periodEnd) {
      if (query.periodStart && query.periodEnd) {
        where.billingPeriodStart = { gte: new Date(query.periodStart) };
        where.billingPeriodEnd = { lte: new Date(query.periodEnd) };
      } else if (query.periodStart) {
        where.billingPeriodStart = { gte: new Date(query.periodStart) };
      } else if (query.periodEnd) {
        where.billingPeriodEnd = { lte: new Date(query.periodEnd) };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.clientInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ invoiceDate: 'desc' }],
        include: {
          client: { select: { id: true, clientCode: true, companyName: true } },
          branch: { select: { id: true, branchName: true, branchCode: true } },
        },
      }),
      this.prisma.clientInvoice.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoiceById(id: string, user: AuthenticatedUserContext) {
    const invoice = await this.prisma.clientInvoice.findUnique({
      where: { id },
      include: {
        client: true,
        branch: true,
        contract: true,
        items: {
          include: {
            clientSite: true,
            designation: true,
            billingRate: true,
          },
        },
        adjustments: true,
        payments: true,
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!invoice || invoice.agencyId !== user.agencyId || Boolean(invoice.deletedAt)) {
      throw new NotFoundException('Client invoice not found');
    }
    if (user.branchId && invoice.branchId !== user.branchId) {
      throw new ForbiddenException('Invoice belongs to a different branch');
    }

    return invoice;
  }

  // ==========================================
  // 3. INVOICE FINALIZATION & UPDATES
  // ==========================================

  async updateInvoice(id: string, dto: UpdateInvoiceDto, user: AuthenticatedUserContext) {
    const invoice = await this.getInvoiceById(id, user);

    if (invoice.isLocked) {
      throw new BadRequestException('INVOICE_LOCKED: Cannot modify a locked/finalized invoice');
    }

    const updated = await this.prisma.clientInvoice.update({
      where: { id },
      data: {
        ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: { client: true, branch: true },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: invoice.branchId,
      userId: user.id,
      entityName: 'ClientInvoice',
      entityId: id,
      action: AuditAction.UPDATE,
      changeSummary: `INVOICE_UPDATED: Updated invoice ${invoice.invoiceNumber}`,
      newValues: dto,
    });

    return updated;
  }

  async finalizeInvoice(id: string, user: AuthenticatedUserContext) {
    const invoice = await this.getInvoiceById(id, user);

    if (invoice.isLocked || invoice.status === InvoiceStatus.APPROVED) {
      return invoice;
    }

    const finalized = await this.prisma.clientInvoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.APPROVED,
        isLocked: true,
        approvedById: user.id,
      },
      include: { client: true, branch: true, items: true },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: invoice.branchId,
      userId: user.id,
      entityName: 'ClientInvoice',
      entityId: id,
      action: AuditAction.APPROVE,
      changeSummary: `INVOICE_FINALIZED: Finalized tax invoice ${invoice.invoiceNumber}`,
      newValues: { status: InvoiceStatus.APPROVED, isLocked: true },
    });

    return finalized;
  }

  // ==========================================
  // 4. INVOICE ADJUSTMENTS (Credit/Debit Notes)
  // ==========================================

  async createAdjustment(dto: CreateInvoiceAdjustmentDto, user: AuthenticatedUserContext) {
    const invoice = await this.getInvoiceById(dto.invoiceId, user);

    const financialYear = this.getFinancialYear(new Date());
    const branch = invoice.branch;

    return this.prisma.$transaction(async (tx) => {
      const seqRecord = await tx.invoiceSequence.upsert({
        where: {
          branchId_financialYear_documentType: {
            branchId: invoice.branchId,
            financialYear,
            documentType: 'ADJ',
          },
        },
        update: {
          lastSequence: { increment: 1 },
        },
        create: {
          agencyId: user.agencyId,
          branchId: invoice.branchId,
          financialYear,
          documentType: 'ADJ',
          lastSequence: 1,
        },
      });

      const noteStr = seqRecord.lastSequence.toString().padStart(4, '0');
      const noteNumber = `${branch.branchCode}/ADJ/${financialYear}/${noteStr}`;

      const totalTax = Number(dto.cgstAmount || 0) + Number(dto.sgstAmount || 0) + Number(dto.igstAmount || 0);
      const totalAmount = Number((Number(dto.subtotalAmount) + totalTax).toFixed(2));

      const adjustment = await tx.invoiceAdjustment.create({
        data: {
          agencyId: user.agencyId,
          branchId: invoice.branchId,
          invoiceId: invoice.id,
          noteNumber,
          noteType: dto.noteType,
          issueDate: new Date(dto.issueDate),
          reason: dto.reason,
          subtotalAmount: Number(dto.subtotalAmount),
          cgstAmount: Number(dto.cgstAmount || 0),
          sgstAmount: Number(dto.sgstAmount || 0),
          igstAmount: Number(dto.igstAmount || 0),
          totalAmount,
          approvedById: user.id,
        },
      });

      // Update invoice balanceDue and creditAdjustmentAmount
      let newCreditAdjustment = Number(invoice.creditAdjustmentAmount);
      let newBalanceDue = Number(invoice.balanceDue);

      if (dto.noteType === InvoiceAdjustmentType.CREDIT_NOTE) {
        newCreditAdjustment += totalAmount;
        newBalanceDue = Math.max(0, Number((newBalanceDue - totalAmount).toFixed(2)));
      } else {
        newBalanceDue = Number((newBalanceDue + totalAmount).toFixed(2));
      }

      await tx.clientInvoice.update({
        where: { id: invoice.id },
        data: {
          creditAdjustmentAmount: newCreditAdjustment,
          balanceDue: newBalanceDue,
          status: newBalanceDue === 0 ? InvoiceStatus.PAID : invoice.status,
        },
      });

      await this.auditService.record({
        agencyId: user.agencyId,
        branchId: invoice.branchId,
        userId: user.id,
        entityName: 'InvoiceAdjustment',
        entityId: adjustment.id,
        action: AuditAction.CREATE,
        changeSummary: `ADJUSTMENT_CREATED: Issued ${dto.noteType} ${noteNumber} for ₹${totalAmount} on invoice ${invoice.invoiceNumber}`,
        newValues: { noteNumber, totalAmount, reason: dto.reason },
      });

      return adjustment;
    });
  }

  // ==========================================
  // 5. CLIENT PAYMENTS & RECEIVABLES
  // ==========================================

  async recordPayment(dto: RecordClientPaymentDto, user: AuthenticatedUserContext) {
    const invoice = await this.getInvoiceById(dto.invoiceId, user);

    const received = Number(dto.amountReceived);
    const tds = Number(dto.tdsDeducted || 0);
    const totalRemittance = Number((received + tds).toFixed(2));

    if (totalRemittance <= 0) {
      throw new BadRequestException('Payment amount received must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.clientPayment.create({
        data: {
          agencyId: user.agencyId,
          branchId: invoice.branchId,
          clientId: invoice.clientId,
          invoiceId: invoice.id,
          paymentDate: new Date(dto.paymentDate),
          amountReceived: received,
          tdsDeducted: tds,
          paymentMode: dto.paymentMode,
          referenceTransactionId: dto.referenceTransactionId,
          bankName: dto.bankName,
          notes: dto.notes,
          recordedById: user.id,
        },
      });

      const newPaidAmount = Number((Number(invoice.paidAmount) + received).toFixed(2));
      const newBalanceDue = Math.max(
        0,
        Number((Number(invoice.balanceDue) - totalRemittance).toFixed(2)),
      );

      const newStatus =
        newBalanceDue === 0
          ? InvoiceStatus.PAID
          : newPaidAmount > 0
            ? InvoiceStatus.PARTIALLY_PAID
            : invoice.status;

      await tx.clientInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      await this.auditService.record({
        agencyId: user.agencyId,
        branchId: invoice.branchId,
        userId: user.id,
        entityName: 'ClientPayment',
        entityId: payment.id,
        action: AuditAction.CREATE,
        changeSummary: `PAYMENT_RECORDED: Recorded client receipt of ₹${received} (TDS: ₹${tds}) for invoice ${invoice.invoiceNumber}`,
        newValues: {
          amountReceived: received,
          tdsDeducted: tds,
          balanceRemaining: newBalanceDue,
        },
      });

      return payment;
    });
  }

  async getPayments(query: PaymentQueryDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || query.branchId;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId,
      ...(branchId ? { branchId } : {}),
    };

    if (query.clientId) where.clientId = query.clientId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;

    const [items, total] = await Promise.all([
      this.prisma.clientPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ paymentDate: 'desc' }],
        include: {
          client: { select: { id: true, clientCode: true, companyName: true } },
          branch: { select: { id: true, branchName: true, branchCode: true } },
        },
      }),
      this.prisma.clientPayment.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
