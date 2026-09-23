import { apiRequest, ApiResponse } from './api';

export interface ClientItem {
  id: string;
  agencyId: string;
  branchId: string;
  clientCode: string;
  companyName: string;
  legalName: string;
  pan: string;
  gstin: string;
  stateCode: string;
  billingAddress: string;
  contactPersonName: string;
  contactEmail: string;
  contactPhone: string;
  paymentTermsDays: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    branchName: string;
    branchCode: string;
  };
}

export interface ClientSiteItem {
  id: string;
  clientId: string;
  siteCode: string;
  siteName: string;
  address: string;
  city: string;
  stateCode: string;
  pincode: string;
  siteSupervisorName?: string | null;
  siteSupervisorPhone?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ClientContractItem {
  id: string;
  clientId: string;
  contractNumber: string;
  title: string;
  startDate: string;
  endDate: string;
  billingCycle: 'MONTHLY' | 'FORTNIGHTLY' | 'WEEKLY' | 'DAILY';
  noticePeriodDays: number;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';
  autoRenew: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface ClientBillingRateItem {
  id: string;
  clientId: string;
  clientSiteId?: string | null;
  designationId: string;
  billingModel: 'MONTHLY_FIXED' | 'PER_EMPLOYEE' | 'PER_SHIFT' | 'HOURLY' | 'OVERTIME';
  rateAmount: number;
  standardShiftHours: number;
  otHourlyRate: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt: string;
  designation?: {
    id: string;
    name: string;
    code: string;
  };
  clientSite?: {
    id: string;
    siteName: string;
    siteCode: string;
  } | null;
}

export interface ClientDetailResponse extends ClientItem {
  sites: ClientSiteItem[];
  contracts: ClientContractItem[];
  billingRates: ClientBillingRateItem[];
}

export interface ClientListResponse {
  items: ClientItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const clientsApi = {
  async getClients(query: {
    search?: string;
    status?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<ClientListResponse>> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.status && query.status !== 'ALL') params.append('status', query.status);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return apiRequest<ClientListResponse>(`/clients${qs ? `?${qs}` : ''}`);
  },

  async getClientById(id: string): Promise<ApiResponse<ClientDetailResponse>> {
    return apiRequest<ClientDetailResponse>(`/clients/${id}`);
  },

  async createClient(data: any): Promise<ApiResponse<ClientItem>> {
    return apiRequest<ClientItem>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClient(id: string, data: any): Promise<ApiResponse<ClientItem>> {
    return apiRequest<ClientItem>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateClientStatus(id: string, status: string): Promise<ApiResponse<ClientItem>> {
    return apiRequest<ClientItem>(`/clients/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteClient(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(`/clients/${id}`, {
      method: 'DELETE',
    });
  },

  // SITES
  async getSites(clientId: string): Promise<ApiResponse<ClientSiteItem[]>> {
    return apiRequest<ClientSiteItem[]>(`/clients/${clientId}/sites`);
  },

  async createSite(clientId: string, data: any): Promise<ApiResponse<ClientSiteItem>> {
    return apiRequest<ClientSiteItem>(`/clients/${clientId}/sites`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSite(clientId: string, siteId: string, data: any): Promise<ApiResponse<ClientSiteItem>> {
    return apiRequest<ClientSiteItem>(`/clients/${clientId}/sites/${siteId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteSite(clientId: string, siteId: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(`/clients/${clientId}/sites/${siteId}`, {
      method: 'DELETE',
    });
  },

  // CONTRACTS
  async getContracts(clientId: string): Promise<ApiResponse<ClientContractItem[]>> {
    return apiRequest<ClientContractItem[]>(`/clients/${clientId}/contracts`);
  },

  async createContract(clientId: string, data: any): Promise<ApiResponse<ClientContractItem>> {
    return apiRequest<ClientContractItem>(`/clients/${clientId}/contracts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // BILLING RATES
  async getBillingRates(clientId: string): Promise<ApiResponse<ClientBillingRateItem[]>> {
    return apiRequest<ClientBillingRateItem[]>(`/clients/${clientId}/billing-rates`);
  },

  async createBillingRate(clientId: string, data: any): Promise<ApiResponse<ClientBillingRateItem>> {
    return apiRequest<ClientBillingRateItem>(`/clients/${clientId}/billing-rates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createNewRateVersion(clientId: string, rateId: string, data: any): Promise<ApiResponse<ClientBillingRateItem>> {
    return apiRequest<ClientBillingRateItem>(`/clients/${clientId}/billing-rates/${rateId}/version`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deactivateBillingRate(clientId: string, rateId: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(`/clients/${clientId}/billing-rates/${rateId}`, {
      method: 'DELETE',
    });
  },
};
