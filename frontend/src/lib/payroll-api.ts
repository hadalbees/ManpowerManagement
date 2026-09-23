import { apiRequest, ApiResponse } from './api';

export type PayrollBatchStatus = 'DRAFT' | 'REVIEWED' | 'LOCKED';
export type AdvanceStatus = 'ACTIVE' | 'REPAID' | 'CANCELLED';
export type StatutoryRuleType = 'EPF' | 'ESIC' | 'PROFESSIONAL_TAX' | 'LWF' | 'TDS';
export type StatutoryCalcMethod = 'PERCENTAGE_OF_BASIC' | 'PERCENTAGE_OF_GROSS' | 'SLAB_BASED' | 'FIXED_AMOUNT';
export type RoundingMethod = 'NEAREST_INTEGER' | 'ROUND_UP' | 'ROUND_DOWN' | 'EXACT';

export interface SalaryCalculationItem {
  id: string;
  payrollBatchId: string;
  employeeId: string;
  totalCalendarDays: number;
  payableDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  weeklyOffDays: number;
  overtimeHours: number;
  basicPay: number;
  dearnessAllowance: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  grossEarned: number;
  overtimeAmount: number;
  epfEmployee: number;
  epfEmployer: number;
  epsEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  labourWelfareFund: number;
  advanceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  snapshotData: any;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    uanNumber?: string;
    esicIpNumber?: string;
    bankAccountNoMasked?: string;
    bankIfsc?: string;
    primaryDesignation?: {
      title?: string;
      name?: string;
    };
  };
  payslip?: {
    id: string;
    payslipNumber: string;
    isPublished: boolean;
  };
}

export interface PayrollBatch {
  id: string;
  agencyId: string;
  branchId: string;
  batchNumber: string;
  month: number;
  year: number;
  status: PayrollBatchStatus;
  totalEmployees: number;
  totalGrossWages: number;
  totalDeductions: number;
  totalNetWages: number;
  totalEpfEmployer: number;
  totalEsiEmployer: number;
  processedAt?: string;
  lockedAt?: string;
  approvedById?: string;
  createdAt: string;
  branch?: {
    id: string;
    branchName: string;
    branchCode: string;
  };
  approvedBy?: {
    fullName: string;
  };
  calculations?: SalaryCalculationItem[];
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  basicPay: number;
  dearnessAllowance: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  overtimeRatePerHour: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  lwfApplicable: boolean;
  tdsPercentage: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
}

export interface SalaryAdvance {
  id: string;
  agencyId: string;
  branchId: string;
  employeeId: string;
  advanceAmount: number;
  recoveryInstallments: number;
  installmentAmount: number;
  balanceAmount: number;
  disbursedDate: string;
  recoveryStartDate: string;
  reason?: string;
  status: AdvanceStatus;
  createdAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
  branch?: {
    branchName: string;
    branchCode: string;
  };
}

export interface Payslip {
  id: string;
  salaryCalculationId: string;
  employeeId: string;
  payslipNumber: string;
  month: number;
  year: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  isPublished: boolean;
  publishedAt?: string;
  pdfUrl?: string;
  createdAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    uanNumber?: string;
    esicIpNumber?: string;
    bankAccountNoMasked?: string;
    bankIfsc?: string;
    primaryDesignation?: {
      title?: string;
      name?: string;
    };
  };
  salaryCalculation?: SalaryCalculationItem;
}

export interface StatutoryRule {
  id: string;
  agencyId: string;
  stateCode?: string;
  ruleType: StatutoryRuleType;
  calculationMethod: StatutoryCalcMethod;
  employeeRate: number;
  employerRate: number;
  wageCeiling?: number;
  slabConfiguration?: any;
  roundingMethod: RoundingMethod;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export const payrollApi = {
  // Batches
  getBatches: (params?: { branchId?: string; year?: number; status?: PayrollBatchStatus; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.year) query.append('year', params.year.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return apiRequest<{ items: PayrollBatch[]; total: number; page: number; totalPages: number }>(
      `/payroll/batches?${query.toString()}`,
    );
  },

  getBatchById: (id: string) => {
    return apiRequest<PayrollBatch>(`/payroll/batches/${id}`);
  },

  createBatch: (data: { branchId: string; month: number; year: number }) => {
    return apiRequest<PayrollBatch>('/payroll/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  calculateBatch: (id: string) => {
    return apiRequest<PayrollBatch>(`/payroll/batches/${id}/calculate`, {
      method: 'POST',
    });
  },

  lockBatch: (id: string) => {
    return apiRequest<PayrollBatch>(`/payroll/batches/${id}/lock`, {
      method: 'POST',
    });
  },

  // Salary Structure
  getSalaryStructure: (employeeId: string) => {
    return apiRequest<SalaryStructure>(`/payroll/salary-structures/${employeeId}`);
  },

  upsertSalaryStructure: (employeeId: string, data: any) => {
    return apiRequest<SalaryStructure>(`/payroll/salary-structures/${employeeId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Advances
  getAdvances: (params?: { branchId?: string; employeeId?: string; status?: AdvanceStatus; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return apiRequest<{ items: SalaryAdvance[]; total: number; page: number; totalPages: number }>(
      `/payroll/advances?${query.toString()}`,
    );
  },

  createAdvance: (data: {
    employeeId: string;
    branchId: string;
    advanceAmount: number;
    recoveryInstallments: number;
    installmentAmount?: number;
    disbursedDate: string;
    recoveryStartDate: string;
    reason?: string;
  }) => {
    return apiRequest<SalaryAdvance>('/payroll/advances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Payslips
  getPayslips: (params?: { employeeId?: string; month?: number; year?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.employeeId) query.append('employeeId', params.employeeId);
    if (params?.month) query.append('month', params.month.toString());
    if (params?.year) query.append('year', params.year.toString());
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return apiRequest<{ items: Payslip[]; total: number; page: number; totalPages: number }>(
      `/payroll/payslips?${query.toString()}`,
    );
  },

  getPayslipById: (id: string) => {
    return apiRequest<Payslip>(`/payroll/payslips/${id}`);
  },

  // Statutory Rules
  getStatutoryRules: () => {
    return apiRequest<StatutoryRule[]>('/payroll/statutory-rules');
  },

  updateStatutoryRule: (id: string, data: Partial<StatutoryRule>) => {
    return apiRequest<StatutoryRule>(`/payroll/statutory-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
