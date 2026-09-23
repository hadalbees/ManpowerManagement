import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import { ReportFilterDto, ReportType, ReportFormat } from './dto/report.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private maskSensitive(value?: string | null, visibleLastChars: number = 4): string {
    if (!value) return 'N/A';
    if (value.length <= visibleLastChars) return 'XXXX';
    const maskedPart = 'X'.repeat(value.length - visibleLastChars);
    return `${maskedPart}${value.slice(-visibleLastChars)}`;
  }

  private jsonToCsv(headers: { key: string; label: string }[], data: any[]): string {
    const headerRow = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
    const dataRows = data.map((row) =>
      headers
        .map((h) => {
          let val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]) : '';
          // Mitigate CSV Formula Injection (CWE-1236) for spreadsheet software
          if (/^[=\+\-\@\t\r]/.test(val) && isNaN(Number(val))) {
            val = `'${val}`;
          }
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    return [headerRow, ...dataRows].join('\n');
  }

  async generateReport(dto: ReportFilterDto, user: AuthenticatedUserContext) {
    const agencyId = user.agencyId;
    const branchId = user.branchId || dto.branchId || undefined;

    let result: { title: string; headers: { key: string; label: string }[]; rows: any[] };

    switch (dto.reportType) {
      case ReportType.EMPLOYEE_MASTER:
        result = await this.getEmployeeReport(agencyId, branchId, dto.status);
        break;

      case ReportType.CLIENT_SUMMARY:
        result = await this.getClientReport(agencyId, branchId);
        break;

      case ReportType.OPERATIONS_MUSTER:
        result = await this.getOperationsReport(agencyId, branchId, dto.startDate, dto.endDate);
        break;

      case ReportType.PAYROLL_SUMMARY:
        result = await this.getPayrollReport(agencyId, branchId, dto.startDate, dto.endDate);
        break;

      case ReportType.BILLING_RECEIVABLES:
        result = await this.getBillingReport(agencyId, branchId, dto.clientId, dto.startDate, dto.endDate);
        break;

      case ReportType.COMPLIANCE_STATUS:
        result = await this.getComplianceReport(agencyId, branchId);
        break;

      default:
        throw new BadRequestException(`Unsupported report type: ${dto.reportType}`);
    }

    if (dto.format === ReportFormat.CSV) {
      const csv = this.jsonToCsv(result.headers, result.rows);
      await this.auditService.record({
        agencyId,
        branchId: branchId || null,
        userId: user.id,
        entityName: 'Report',
        entityId: dto.reportType,
        action: AuditAction.APPROVE,
        changeSummary: `REPORT_EXPORTED: Exported CSV report for ${dto.reportType} with ${result.rows.length} records`,
      });

      return {
        format: 'CSV',
        fileName: `${dto.reportType.toLowerCase()}_report_${Date.now()}.csv`,
        contentType: 'text/csv',
        data: csv,
      };
    }

    return {
      format: 'JSON',
      title: result.title,
      headers: result.headers,
      rows: result.rows,
      totalCount: result.rows.length,
    };
  }

  // ==========================================
  // 1. EMPLOYEE REPORT
  // ==========================================
  private async getEmployeeReport(agencyId: string, branchId?: string, status?: string) {
    const employees = await this.prisma.employee.findMany({
      where: {
        agencyId,
        ...(branchId ? { branchId } : {}),
        ...(status ? { status: status as any } : {}),
        deletedAt: null,
      },
      include: {
        branch: true,
        primaryDesignation: true,
      },
      orderBy: { employeeCode: 'asc' },
    });

    const headers = [
      { key: 'employeeCode', label: 'Employee Code' },
      { key: 'fullName', label: 'Employee Name' },
      { key: 'branch', label: 'Branch' },
      { key: 'designation', label: 'Designation' },
      { key: 'phone', label: 'Contact Phone' },
      { key: 'joiningDate', label: 'Joining Date' },
      { key: 'bankAccount', label: 'Bank Account (Masked)' },
      { key: 'bankIfsc', label: 'Bank IFSC' },
      { key: 'status', label: 'Status' },
    ];

    const rows = employees.map((e: any) => ({
      employeeCode: e.employeeCode,
      fullName: `${e.firstName} ${e.lastName}`,
      branch: e.branch?.branchName || e.branch?.name || 'HQ',
      designation: e.primaryDesignation?.name || 'Staff',
      phone: this.maskSensitive(e.phone, 4),
      joiningDate: e.dateOfJoining ? (e.dateOfJoining instanceof Date ? e.dateOfJoining.toISOString().split('T')[0] : String(e.dateOfJoining).split('T')[0]) : (e.joiningDate ? (e.joiningDate instanceof Date ? e.joiningDate.toISOString().split('T')[0] : String(e.joiningDate).split('T')[0]) : 'N/A'),
      bankAccount: e.bankAccountNoMasked || 'XXXXXX1234',
      bankIfsc: e.bankIfsc || 'N/A',
      status: e.status,
    }));

    return { title: 'Employee Master Registry Report', headers, rows };
  }

  // ==========================================
  // 2. CLIENT SUMMARY REPORT
  // ==========================================
  private async getClientReport(agencyId: string, branchId?: string) {
    const clients = await this.prisma.client.findMany({
      where: {
        agencyId,
        ...(branchId ? { branchId } : {}),
        deletedAt: null,
      },
      include: {
        branch: true,
        sites: { where: { deletedAt: null } },
        invoices: { where: { deletedAt: null } },
      },
      orderBy: { clientCode: 'asc' },
    });

    const headers = [
      { key: 'clientCode', label: 'Client Code' },
      { key: 'companyName', label: 'Company Name' },
      { key: 'branch', label: 'Branch' },
      { key: 'activeSites', label: 'Active Sites Count' },
      { key: 'pan', label: 'PAN' },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'totalBilled', label: 'Total Invoiced (₹)' },
      { key: 'balanceDue', label: 'Outstanding Balance (₹)' },
      { key: 'status', label: 'Status' },
    ];

    const rows = clients.map((c: any) => {
      const totalBilled = c.invoices ? c.invoices.reduce((acc: number, inv: any) => acc + Number(inv.totalInvoiceAmount || 0), 0) : 0;
      const balanceDue = c.invoices ? c.invoices.reduce((acc: number, inv: any) => acc + Number(inv.balanceDue || 0), 0) : 0;
      return {
        clientCode: c.clientCode,
        companyName: c.companyName || c.name,
        branch: c.branch?.branchName || c.branch?.name || 'HQ',
        activeSites: c.sites?.length || 0,
        pan: c.pan || 'N/A',
        gstin: c.gstin || 'N/A',
        totalBilled: Number(totalBilled.toFixed(2)),
        balanceDue: Number(balanceDue.toFixed(2)),
        status: c.status,
      };
    });

    return { title: 'Client Accounts & Commercial Summary', headers, rows };
  }

  // ==========================================
  // 3. OPERATIONS MUSTER REPORT
  // ==========================================
  private async getOperationsReport(agencyId: string, branchId?: string, startDate?: string, endDate?: string) {
    const whereDate: any = {};
    if (startDate) whereDate.gte = new Date(startDate);
    if (endDate) whereDate.lte = new Date(endDate);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        agencyId,
        ...(branchId ? { branchId } : {}),
        ...(startDate || endDate ? { shiftBusinessDate: whereDate } : {}),
      },
      include: {
        employee: { select: { employeeCode: true, firstName: true, lastName: true } },
        branch: { select: { branchName: true } },
        clientSite: { select: { siteName: true } },
      },
      orderBy: { shiftBusinessDate: 'desc' },
      take: 200, // safety limit
    });

    const headers = [
      { key: 'date', label: 'Shift Date' },
      { key: 'branch', label: 'Branch' },
      { key: 'employee', label: 'Employee' },
      { key: 'site', label: 'Deployment Site' },
      { key: 'shiftType', label: 'Shift Type' },
      { key: 'status', label: 'Attendance Status' },
      { key: 'workedHours', label: 'Worked Hours' },
      { key: 'overtimeHours', label: 'Overtime Hours' },
      { key: 'isLocked', label: 'Payroll Locked' },
    ];

    const rows = attendances.map((a: any) => {
      const shiftDate = a.shiftBusinessDate || a.date;
      return {
        date: shiftDate ? (shiftDate instanceof Date ? shiftDate.toISOString().split('T')[0] : String(shiftDate).split('T')[0]) : 'N/A',
        branch: a.branch?.branchName || a.branch?.name || 'HQ',
        employee: a.employee ? `${a.employee.employeeCode} - ${a.employee.firstName} ${a.employee.lastName}` : 'N/A',
        site: a.clientSite?.siteName || a.clientSite?.name || 'HQ / Standby',
        shiftType: a.shiftType || 'DAY',
        status: a.status,
        workedHours: Number(a.workedHours || 0),
        overtimeHours: Number(a.overtimeHours || 0),
        isLocked: a.isLocked ? 'YES' : 'NO',
      };
    });

    return { title: 'Operations Attendance Muster Roll Report', headers, rows };
  }

  // ==========================================
  // 4. PAYROLL SUMMARY REPORT
  // ==========================================
  private async getPayrollReport(agencyId: string, branchId?: string, startDate?: string, endDate?: string) {
    const batches = await this.prisma.payrollBatch.findMany({
      where: {
        agencyId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        branch: true,
        calculations: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const headers = [
      { key: 'batchNumber', label: 'Batch #' },
      { key: 'branch', label: 'Branch' },
      { key: 'period', label: 'Period' },
      { key: 'totalEmployees', label: 'Employees Headcount' },
      { key: 'grossWages', label: 'Gross Wages (₹)' },
      { key: 'totalDeductions', label: 'Total Deductions (₹)' },
      { key: 'netWages', label: 'Net Disbursed (₹)' },
      { key: 'epfTotal', label: 'Total EPF (₹)' },
      { key: 'esicTotal', label: 'Total ESIC (₹)' },
      { key: 'status', label: 'Status' },
    ];

    const rows = batches.map((b: any) => {
      const calcs = b.calculations || b.records || [];
      const epfTotal = calcs.reduce((acc: number, c: any) => acc + Number(c.epfEmployee || c.pfEmployee || 0) + Number(c.epfEmployer || 0), 0);
      const esicTotal = calcs.reduce((acc: number, c: any) => acc + Number(c.esicEmployee || c.esiEmployee || 0) + Number(c.esicEmployer || 0), 0);

      return {
        batchNumber: b.batchNumber || b.id,
        branch: b.branch?.branchName || b.branch?.name || 'HQ',
        period: `${b.year}-${String(b.month).padStart(2, '0')}`,
        totalEmployees: b.totalEmployees || 0,
        grossWages: Number(b.totalGrossWages || 0),
        totalDeductions: Number(b.totalDeductions || 0),
        netWages: Number(b.totalNetWages || 0),
        epfTotal: Number(epfTotal.toFixed(2)),
        esicTotal: Number(esicTotal.toFixed(2)),
        status: b.status || b.batchStatus,
      };
    });

    return { title: 'Payroll Wages & Statutory Summary Report', headers, rows };
  }

  // ==========================================
  // 5. BILLING & RECEIVABLES REPORT
  // ==========================================
  private async getBillingReport(agencyId: string, branchId?: string, clientId?: string, startDate?: string, endDate?: string) {
    const where: any = {
      agencyId,
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
      ...(clientId ? { clientId } : {}),
    };
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    const invoices = await this.prisma.clientInvoice.findMany({
      where,
      include: {
        client: true,
        branch: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const headers = [
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'invoiceDate', label: 'Date' },
      { key: 'client', label: 'Client Name' },
      { key: 'branch', label: 'Branch' },
      { key: 'subtotal', label: 'Subtotal (₹)' },
      { key: 'taxAmount', label: 'GST Tax (₹)' },
      { key: 'totalAmount', label: 'Invoice Total (₹)' },
      { key: 'paidAmount', label: 'Paid (₹)' },
      { key: 'balanceDue', label: 'Balance Due (₹)' },
      { key: 'status', label: 'Status' },
    ];

    const rows = invoices.map((inv: any) => {
      const invDate = inv.invoiceDate;
      return {
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: invDate ? (invDate instanceof Date ? invDate.toISOString().split('T')[0] : String(invDate).split('T')[0]) : 'N/A',
        client: inv.client?.companyName || inv.client?.name || 'Client',
        branch: inv.branch?.branchName || inv.branch?.name || 'HQ',
        subtotal: Number(inv.subtotalAmount || 0),
        taxAmount: Number(inv.totalTaxAmount || inv.totalGstAmount || 0),
        totalAmount: Number(inv.totalInvoiceAmount || 0),
        paidAmount: Number(inv.paidAmount || 0),
        balanceDue: Number(inv.balanceDue || 0),
        status: inv.status,
      };
    });

    return { title: 'Billing Revenue & Receivables Ageing Report', headers, rows };
  }

  // ==========================================
  // 6. COMPLIANCE STATUS REPORT
  // ==========================================
  private async getComplianceReport(agencyId: string, branchId?: string) {
    const documents = await this.prisma.document.findMany({
      where: {
        agencyId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        documentType: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    const headers = [
      { key: 'documentType', label: 'Document Type' },
      { key: 'fileName', label: 'File Name' },
      { key: 'entityType', label: 'Entity Type' },
      { key: 'entityId', label: 'Entity ID' },
      { key: 'documentNumber', label: 'Document #' },
      { key: 'expiryDate', label: 'Expiry Date' },
      { key: 'verificationStatus', label: 'Verification' },
      { key: 'version', label: 'Revision Version' },
    ];

    const rows = documents.map((d: any) => ({
      documentType: d.documentType?.name || 'Document',
      fileName: d.originalFileName,
      entityType: d.entityType,
      entityId: d.entityId,
      documentNumber: d.documentNumber || 'N/A',
      expiryDate: d.expiryDate ? (d.expiryDate instanceof Date ? d.expiryDate.toISOString().split('T')[0] : String(d.expiryDate).split('T')[0]) : 'No Expiry',
      verificationStatus: d.verificationStatus,
      version: `v${d.version}`,
    }));

    return { title: 'Compliance Document Verification & Expiry Audit Report', headers, rows };
  }
}
