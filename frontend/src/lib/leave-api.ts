import { apiRequest, ApiResponse } from './api';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  daysPerYear: number;
  isPaid: boolean;
  isAccumulative: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  openingBalance: number;
  accruedDays: number;
  consumedDays: number;
  closingBalance: number;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    branchId: string;
    branch?: {
      id: string;
      branchName: string;
      branchCode: string;
    };
  };
  leaveType?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewerComments?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    branchId: string;
    branch?: {
      id: string;
      branchName: string;
      branchCode: string;
    };
  };
  leaveType?: LeaveType;
  reviewedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  reason: string;
}

export interface UpdateLeaveRequestDto {
  startDate?: string;
  endDate?: string;
  isHalfDay?: boolean;
  reason?: string;
}

export interface ApproveLeaveRequestDto {
  reviewerComments?: string;
}

export interface RejectLeaveRequestDto {
  rejectionReason: string;
}

export interface CancelLeaveRequestDto {
  cancellationReason?: string;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  openingBalance: number;
}

export interface AdjustLeaveBalanceDto {
  adjustmentDays: number;
  reason: string;
}

export interface LeaveRequestQueryDto {
  page?: number;
  limit?: number;
  employeeId?: string;
  leaveTypeId?: string;
  status?: LeaveStatus;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface LeaveBalanceQueryDto {
  employeeId?: string;
  leaveTypeId?: string;
  year?: number;
  branchId?: string;
}

export const leaveApi = {
  // Types
  async getLeaveTypes(activeOnly = false): Promise<ApiResponse<LeaveType[]>> {
    return apiRequest<LeaveType[]>(`/leave/types?activeOnly=${activeOnly}`);
  },

  async getLeaveTypeById(id: string): Promise<ApiResponse<LeaveType>> {
    return apiRequest<LeaveType>(`/leave/types/${id}`);
  },

  // Balances
  async getLeaveBalances(query: LeaveBalanceQueryDto = {}): Promise<ApiResponse<LeaveBalance[]>> {
    const params = new URLSearchParams();
    if (query.employeeId) params.append('employeeId', query.employeeId);
    if (query.leaveTypeId) params.append('leaveTypeId', query.leaveTypeId);
    if (query.year) params.append('year', query.year.toString());
    if (query.branchId) params.append('branchId', query.branchId);
    const queryString = params.toString();
    return apiRequest<LeaveBalance[]>(`/leave/balances${queryString ? `?${queryString}` : ''}`);
  },

  async createLeaveBalance(dto: CreateLeaveBalanceDto): Promise<ApiResponse<LeaveBalance>> {
    return apiRequest<LeaveBalance>('/leave/balances', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async adjustLeaveBalance(id: string, dto: AdjustLeaveBalanceDto): Promise<ApiResponse<LeaveBalance>> {
    return apiRequest<LeaveBalance>(`/leave/balances/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // Requests
  async getLeaveRequests(query: LeaveRequestQueryDto = {}): Promise<ApiResponse<{ items: LeaveRequest[]; pagination: any }>> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.employeeId) params.append('employeeId', query.employeeId);
    if (query.leaveTypeId) params.append('leaveTypeId', query.leaveTypeId);
    if (query.status) params.append('status', query.status);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
    const queryString = params.toString();
    return apiRequest<{ items: LeaveRequest[]; pagination: any }>(`/leave/requests${queryString ? `?${queryString}` : ''}`);
  },

  async getLeaveRequestById(id: string): Promise<ApiResponse<LeaveRequest>> {
    return apiRequest<LeaveRequest>(`/leave/requests/${id}`);
  },

  async createLeaveRequest(dto: CreateLeaveRequestDto): Promise<ApiResponse<LeaveRequest>> {
    return apiRequest<LeaveRequest>('/leave/requests', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updateLeaveRequest(id: string, dto: UpdateLeaveRequestDto): Promise<ApiResponse<LeaveRequest>> {
    return apiRequest<LeaveRequest>(`/leave/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async approveLeaveRequest(id: string, dto: ApproveLeaveRequestDto): Promise<ApiResponse<LeaveRequest>> {
    return apiRequest<LeaveRequest>(`/leave/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async rejectLeaveRequest(id: string, dto: RejectLeaveRequestDto): Promise<ApiResponse<LeaveRequest>> {
    return apiRequest<LeaveRequest>(`/leave/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async cancelLeaveRequest(id: string, dto: CancelLeaveRequestDto): Promise<ApiResponse<LeaveRequest>> {
    return apiRequest<LeaveRequest>(`/leave/requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },
};
