import { apiRequest, ApiResponse } from './api';

export type ReplacementStatus = 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
export type ReplacementType = 'TEMPORARY' | 'EMERGENCY' | 'PERMANENT';

export interface ReplacementRecord {
  id: string;
  originalDeploymentId: string;
  absentEmployeeId: string;
  replacementEmployeeId: string;
  startDate: string;
  endDate: string;
  replacementType: ReplacementType;
  reason?: string;
  status: ReplacementStatus;
  dispatchedById?: string;
  createdAt: string;
  updatedAt: string;
  originalDeployment?: {
    id: string;
    agencyId: string;
    branchId: string;
    startDate: string;
    endDate?: string | null;
    shiftName: string;
    status: string;
    client?: {
      id: string;
      companyName: string;
      clientCode: string;
    };
    clientSite?: {
      id: string;
      siteName: string;
      siteCode: string;
      city?: string;
    };
    designation?: {
      id: string;
      title: string;
      category: string;
    };
    vehicle?: {
      id: string;
      registrationNumber: string;
      model: string;
    } | null;
  };
  absentEmployee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    phone?: string;
    branchId: string;
    branch?: {
      id: string;
      branchName: string;
      branchCode: string;
    };
    primaryDesignation?: {
      id: string;
      title: string;
      category: string;
    };
  };
  replacementEmployee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    phone?: string;
    drivingLicenseNumber?: string | null;
    drivingLicenseExpiryDate?: string | null;
    branchId: string;
    branch?: {
      id: string;
      branchName: string;
      branchCode: string;
    };
    primaryDesignation?: {
      id: string;
      title: string;
      category: string;
    };
  };
  dispatchedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface CreateReplacementDto {
  originalDeploymentId: string;
  absentEmployeeId: string;
  replacementEmployeeId: string;
  startDate: string;
  endDate: string;
  replacementType?: ReplacementType;
  reason?: string;
}

export interface UpdateReplacementDto {
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export interface ApproveReplacementDto {
  comments?: string;
}

export interface RejectReplacementDto {
  rejectionReason: string;
}

export interface CancelReplacementDto {
  cancellationReason?: string;
}

export interface CompleteReplacementDto {
  notes?: string;
}

export interface ReplacementQueryFilters {
  page?: number;
  limit?: number;
  originalEmployeeId?: string;
  replacementEmployeeId?: string;
  deploymentId?: string;
  status?: ReplacementStatus;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  clientSiteId?: string;
  branchId?: string;
}

export interface ReplacementsListResponse {
  items: ReplacementRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const replacementsApi = {
  // Query / List
  getAll: async (filters: ReplacementQueryFilters = {}): Promise<ApiResponse<ReplacementsListResponse>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.originalEmployeeId) params.append('originalEmployeeId', filters.originalEmployeeId);
    if (filters.replacementEmployeeId) params.append('replacementEmployeeId', filters.replacementEmployeeId);
    if (filters.deploymentId) params.append('deploymentId', filters.deploymentId);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.clientId) params.append('clientId', filters.clientId);
    if (filters.clientSiteId) params.append('clientSiteId', filters.clientSiteId);
    if (filters.branchId) params.append('branchId', filters.branchId);

    const query = params.toString();
    return apiRequest<ReplacementsListResponse>(`/replacements${query ? `?${query}` : ''}`);
  },

  // Get single by ID
  getById: async (id: string): Promise<ApiResponse<ReplacementRecord>> => {
    return apiRequest<ReplacementRecord>(`/replacements/${id}`);
  },

  // Create / Dispatch
  create: async (data: CreateReplacementDto): Promise<ApiResponse<ReplacementRecord>> => {
    return apiRequest<ReplacementRecord>('/replacements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update
  update: async (id: string, data: UpdateReplacementDto): Promise<ApiResponse<ReplacementRecord>> => {
    return apiRequest<ReplacementRecord>(`/replacements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Approve
  approve: async (id: string, data: ApproveReplacementDto = {}): Promise<ApiResponse<ReplacementRecord>> => {
    return apiRequest<ReplacementRecord>(`/replacements/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reject
  reject: async (id: string, data: RejectReplacementDto): Promise<ApiResponse<ReplacementRecord>> => {
    return apiRequest<ReplacementRecord>(`/replacements/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cancel
  cancel: async (id: string, data: CancelReplacementDto = {}): Promise<ApiResponse<ReplacementRecord>> => {
    return apiRequest<ReplacementRecord>(`/replacements/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Complete
  complete: async (id: string, data: CompleteReplacementDto = {}): Promise<ApiResponse<ReplacementRecord>> => {
    return apiRequest<ReplacementRecord>(`/replacements/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Record Attendance for replacement worker
  recordAttendance: async (
    id: string,
    data: { shiftBusinessDate: string; workedHours?: number; supervisorRemarks?: string },
  ): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/replacements/${id}/record-attendance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
