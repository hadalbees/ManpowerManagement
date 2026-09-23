import { apiRequest, ApiResponse } from './api';

export type DeploymentStatus = 'ACTIVE' | 'TRANSFERRED' | 'REPLACED' | 'COMPLETED';

export interface DeploymentShiftItem {
  id: string;
  deploymentId: string;
  dayOfWeek: number;
  isScheduledWorkday: boolean;
}

export interface DeploymentItem {
  id: string;
  agencyId: string;
  branchId: string;
  employeeId: string;
  clientId: string;
  clientSiteId: string;
  designationId: string;
  billingRateId: string;
  salaryStructureId: string;
  vehicleId?: string | null;
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  isNightShift: boolean;
  startDate: string;
  endDate?: string | null;
  status: DeploymentStatus;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    phone?: string;
    status: string;
  };
  client?: {
    id: string;
    clientCode: string;
    companyName: string;
    status: string;
  };
  clientSite?: {
    id: string;
    siteCode: string;
    siteName: string;
    city?: string;
  };
  designation?: {
    id: string;
    name: string;
    code: string;
    category: string;
  };
  vehicle?: {
    id: string;
    vehicleRegistrationNumber: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleType: string;
    status: string;
  } | null;
  billingRate?: {
    id: string;
    rateAmount: number;
    billingModel: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  };
  salaryStructure?: {
    id: string;
    basicPay: number;
    specialAllowance: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
  };
  shifts?: DeploymentShiftItem[];
  branch?: {
    id: string;
    branchName: string;
    branchCode: string;
  };
  auditLogs?: Array<{
    id: string;
    action: string;
    changeSummary: string;
    createdAt: string;
    user?: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
}

export interface DeploymentOptionsResponse {
  clients: Array<{
    id: string;
    clientCode: string;
    companyName: string;
    sites: Array<{
      id: string;
      siteCode: string;
      siteName: string;
      city?: string;
    }>;
  }>;
  designations: Array<{
    id: string;
    name: string;
    code: string;
    category: string;
  }>;
  vehicles: Array<{
    id: string;
    vehicleRegistrationNumber: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleType: string;
    status: string;
  }>;
  employees: Array<{
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    primaryDesignationId?: string;
    salaryStructures: Array<{
      id: string;
      basicPay: number;
      specialAllowance: number;
      effectiveFrom: string;
      effectiveTo?: string | null;
    }>;
  }>;
  clientBillingRates: Array<{
    id: string;
    designationId: string;
    clientSiteId?: string | null;
    rateAmount: number;
    billingModel: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }>;
}

export interface CreateDeploymentPayload {
  employeeId: string;
  clientId: string;
  clientSiteId: string;
  designationId: string;
  billingRateId: string;
  salaryStructureId: string;
  vehicleId?: string;
  branchId?: string;
  startDate: string;
  endDate?: string;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isNightShift?: boolean;
  scheduledWorkdays?: number[];
  remarks?: string;
}

export interface UpdateDeploymentPayload {
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isNightShift?: boolean;
  scheduledWorkdays?: number[];
  remarks?: string;
}

export interface EndDeploymentPayload {
  endDate: string;
  reason: string;
  remarks?: string;
}

export interface ReassignDeploymentPayload {
  effectiveDate: string;
  newClientId: string;
  newClientSiteId: string;
  newDesignationId: string;
  newBillingRateId: string;
  newSalaryStructureId: string;
  newVehicleId?: string;
  newShiftName?: string;
  newShiftStartTime?: string;
  newShiftEndTime?: string;
  newIsNightShift?: boolean;
  newScheduledWorkdays?: number[];
  reason: string;
  remarks?: string;
}

export interface DeploymentQuery {
  search?: string;
  clientId?: string;
  clientSiteId?: string;
  employeeId?: string;
  designationId?: string;
  vehicleId?: string;
  branchId?: string;
  status?: DeploymentStatus;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}

export async function getDeployments(query: DeploymentQuery = {}): Promise<ApiResponse<{ items: DeploymentItem[]; pagination: any }>> {
  const params = new URLSearchParams();
  if (query.search) params.append('search', query.search);
  if (query.clientId) params.append('clientId', query.clientId);
  if (query.clientSiteId) params.append('clientSiteId', query.clientSiteId);
  if (query.employeeId) params.append('employeeId', query.employeeId);
  if (query.designationId) params.append('designationId', query.designationId);
  if (query.vehicleId) params.append('vehicleId', query.vehicleId);
  if (query.branchId) params.append('branchId', query.branchId);
  if (query.status) params.append('status', query.status);
  if (query.activeOnly !== undefined) params.append('activeOnly', String(query.activeOnly));
  if (query.page) params.append('page', String(query.page));
  if (query.limit) params.append('limit', String(query.limit));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/deployments${queryStr}`);
}

export async function getDeploymentById(id: string): Promise<ApiResponse<DeploymentItem>> {
  return apiRequest(`/deployments/${id}`);
}

export async function createDeployment(payload: CreateDeploymentPayload): Promise<ApiResponse<DeploymentItem>> {
  return apiRequest('/deployments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDeployment(id: string, payload: UpdateDeploymentPayload): Promise<ApiResponse<DeploymentItem>> {
  return apiRequest(`/deployments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function endDeployment(id: string, payload: EndDeploymentPayload): Promise<ApiResponse<DeploymentItem>> {
  return apiRequest(`/deployments/${id}/end`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reassignDeployment(id: string, payload: ReassignDeploymentPayload): Promise<ApiResponse<DeploymentItem>> {
  return apiRequest(`/deployments/${id}/reassign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDeploymentOptions(clientId?: string, employeeId?: string): Promise<ApiResponse<DeploymentOptionsResponse>> {
  const params = new URLSearchParams();
  if (clientId) params.append('clientId', clientId);
  if (employeeId) params.append('employeeId', employeeId);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/deployments/options${queryStr}`);
}
