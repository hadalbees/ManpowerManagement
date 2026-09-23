import { apiRequest, ApiResponse } from './api';

export type InvoiceStatus = 'DRAFT' | 'APPROVED' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type InvoiceAdjustmentType = 'CREDIT_NOTE' | 'DEBIT_NOTE';
export type PaymentMode = 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'NEFT_RTGS' | 'UPI';

export interface ClientInvoiceItem {
  id: string;
  clientInvoiceId: string;
  itemDescription: string;
  serviceCategory?: string;
  hsnSacCode?: string;
  unitRate: number;
  quantity: number;
  totalShiftHours?: number;
  regularShifts?: number;
  overtimeHours?: number;
  lineTotal: number;
  deploymentId?: string;
  attendanceId?: string;
  siteName?: string;
  employeeCode?: string;
  employeeName?: string;
}

export interface InvoiceAdjustment {
  id: string;
  clientInvoiceId: string;
  adjustmentType: InvoiceAdjustmentType;
  noteNumber: string;
  amount: number;
  taxAdjustmentAmount: number;
  totalAdjustmentAmount: number;
  reason: string;
  status: string;
  approvedById?: string;
  createdAt: string;
}

export interface ClientPayment {
  id: string;
  agencyId: string;
  branchId: string;
  clientId: string;
  clientInvoiceId: string;
  paymentReceiptNumber: string;
  amount: number;
  tdsDeducted: number;
  paymentMode: PaymentMode;
  transactionReference?: string;
  paymentDate: string;
  notes?: string;
  createdAt: string;
  client?: {
    companyName: string;
    clientCode: string;
  };
  clientInvoice?: {
    invoiceNumber: string;
    totalAmount: number;
    balanceDue: number;
  };
}

export interface ClientInvoice {
  id: string;
  agencyId: string;
  branchId: string;
  clientId: string;
  clientSiteId?: string | null;
  invoiceNumber: string;
  financialYear: string;
  invoiceDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subTotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTaxAmount: number;
  creditAdjustmentAmount: number;
  debitAdjustmentAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  isLocked: boolean;
  notes?: string;
  createdAt: string;
  client?: {
    id: string;
    companyName: string;
    clientCode: string;
    gstin?: string;
    billingStateCode?: string;
    billingAddress?: string;
  };
  branch?: {
    id: string;
    branchName: string;
    branchCode: string;
    stateCode: string;
  };
  items?: ClientInvoiceItem[];
  adjustments?: InvoiceAdjustment[];
  payments?: ClientPayment[];
}

export const billingApi = {
  getInvoices: (params?: {
    branchId?: string;
    clientId?: string;
    status?: InvoiceStatus;
    financialYear?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.clientId) query.append('clientId', params.clientId);
    if (params?.status) query.append('status', params.status);
    if (params?.financialYear) query.append('financialYear', params.financialYear);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return apiRequest<{ items: ClientInvoice[]; total: number; page: number; totalPages: number }>(
      `/billing/invoices?${query.toString()}`,
    );
  },

  getInvoiceById: (id: string) => {
    return apiRequest<ClientInvoice>(`/billing/invoices/${id}`);
  },

  generateInvoice: (data: {
    branchId: string;
    clientId: string;
    clientSiteId?: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    dueDate?: string;
    notes?: string;
  }) => {
    return apiRequest<ClientInvoice>('/billing/invoices/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  finalizeInvoice: (id: string) => {
    return apiRequest<ClientInvoice>(`/billing/invoices/${id}/finalize`, {
      method: 'POST',
    });
  },

  deleteInvoice: (id: string) => {
    return apiRequest<{ message: string }>(`/billing/invoices/${id}`, {
      method: 'DELETE',
    });
  },

  // Adjustments
  getAdjustments: (invoiceId: string) => {
    return apiRequest<InvoiceAdjustment[]>(`/billing/invoices/${invoiceId}/adjustments`);
  },

  createAdjustment: (invoiceId: string, data: {
    adjustmentType: InvoiceAdjustmentType;
    amount: number;
    taxAdjustmentAmount?: number;
    reason: string;
  }) => {
    return apiRequest<InvoiceAdjustment>(`/billing/invoices/${invoiceId}/adjustments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Payments
  getPayments: (params?: {
    branchId?: string;
    clientId?: string;
    clientInvoiceId?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.branchId) query.append('branchId', params.branchId);
    if (params?.clientId) query.append('clientId', params.clientId);
    if (params?.clientInvoiceId) query.append('clientInvoiceId', params.clientInvoiceId);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    return apiRequest<{ items: ClientPayment[]; total: number; page: number; totalPages: number }>(
      `/billing/payments?${query.toString()}`,
    );
  },

  recordPayment: (data: {
    branchId: string;
    clientId: string;
    clientInvoiceId: string;
    amount: number;
    tdsDeducted?: number;
    paymentMode: PaymentMode;
    transactionReference?: string;
    paymentDate: string;
    notes?: string;
  }) => {
    return apiRequest<ClientPayment>('/billing/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
