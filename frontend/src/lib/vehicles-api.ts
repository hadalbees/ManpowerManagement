import { apiRequest, ApiResponse } from './api';

export type VehicleType = 'SEDAN' | 'SUV' | 'BUS' | 'VAN' | 'TRUCK' | 'AUTO';
export type FuelType = 'DIESEL' | 'PETROL' | 'CNG' | 'ELECTRIC';
export type VehicleStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'GROUNDED';

export interface VehicleTypeOption {
  code: VehicleType;
  label: string;
}

export interface FuelTypeOption {
  code: FuelType;
  label: string;
}

export interface VehicleStatusOption {
  code: VehicleStatus;
  label: string;
}

export interface VehicleAssignmentItem {
  id: string;
  vehicleId: string;
  employeeId: string;
  clientSiteId?: string | null;
  startDatetime: string;
  endDatetime?: string | null;
  startOdometerKm: number;
  endOdometerKm?: number | null;
  handoverConditionNotes?: string | null;
  returnConditionNotes?: string | null;
  reasonForChange?: string | null;
  assignedById: string;
  createdAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    phone: string;
    drivingLicenseNumber?: string | null;
    drivingLicenseClass?: string | null;
  };
  clientSite?: {
    id: string;
    siteName: string;
    siteCode: string;
  } | null;
  assignedBy?: {
    id: string;
    fullName: string;
    email?: string;
  };
}

export interface VehicleDocumentItem {
  id: string;
  documentTypeId: string;
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  s3StorageKey: string;
  originalFileName: string;
  verificationStatus: string;
  documentType?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface VehicleItem {
  id: string;
  agencyId: string;
  branchId: string;
  clientId?: string | null;
  vehicleRegistrationNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleType: VehicleType;
  fuelType: FuelType;
  chassisNumber: string;
  engineNumber: string;
  manufacturingYear: number;
  currentOdometerKm: number;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    branchName: string;
    branchCode: string;
  };
  client?: {
    id: string;
    companyName: string;
    clientCode: string;
  } | null;
  currentAssignment?: VehicleAssignmentItem | null;
}

export interface VehicleDetailResponse extends VehicleItem {
  assignments: VehicleAssignmentItem[];
  documents: VehicleDocumentItem[];
}

export interface VehicleListResponse {
  items: VehicleItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const vehiclesApi = {
  async getVehicles(query: {
    search?: string;
    vehicleType?: string;
    status?: string;
    fuelType?: string;
    branchId?: string;
    clientId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<VehicleListResponse>> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.vehicleType && query.vehicleType !== 'ALL') params.append('vehicleType', query.vehicleType);
    if (query.status && query.status !== 'ALL') params.append('status', query.status);
    if (query.fuelType && query.fuelType !== 'ALL') params.append('fuelType', query.fuelType);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.clientId) params.append('clientId', query.clientId);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return apiRequest<VehicleListResponse>(`/vehicles${qs ? `?${qs}` : ''}`);
  },

  async getVehicleById(id: string): Promise<ApiResponse<VehicleDetailResponse>> {
    return apiRequest<VehicleDetailResponse>(`/vehicles/${id}`);
  },

  async getVehicleTypes(): Promise<ApiResponse<VehicleTypeOption[]>> {
    return apiRequest<VehicleTypeOption[]>('/vehicles/types');
  },

  async getFuelTypes(): Promise<ApiResponse<FuelTypeOption[]>> {
    return apiRequest<FuelTypeOption[]>('/vehicles/fuel-types');
  },

  async getVehicleStatuses(): Promise<ApiResponse<VehicleStatusOption[]>> {
    return apiRequest<VehicleStatusOption[]>('/vehicles/statuses');
  },

  async createVehicle(data: any): Promise<ApiResponse<VehicleItem>> {
    return apiRequest<VehicleItem>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateVehicle(id: string, data: any): Promise<ApiResponse<VehicleItem>> {
    return apiRequest<VehicleItem>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateVehicleStatus(id: string, status: VehicleStatus, remarks?: string): Promise<ApiResponse<VehicleItem>> {
    return apiRequest<VehicleItem>(`/vehicles/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
  },

  async deleteVehicle(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  },

  async assignVehicle(vehicleId: string, data: {
    employeeId: string;
    startDatetime: string;
    endDatetime?: string;
    startOdometerKm: number;
    clientSiteId?: string;
    handoverConditionNotes?: string;
    reasonForChange?: string;
  }): Promise<ApiResponse<VehicleAssignmentItem>> {
    return apiRequest<VehicleAssignmentItem>(`/vehicles/${vehicleId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async endVehicleAssignment(vehicleId: string, assignmentId: string, data: {
    endDatetime: string;
    endOdometerKm: number;
    returnConditionNotes?: string;
    reasonForChange?: string;
  }): Promise<ApiResponse<VehicleAssignmentItem>> {
    return apiRequest<VehicleAssignmentItem>(`/vehicles/${vehicleId}/assignments/${assignmentId}/end`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getVehicleAssignments(vehicleId: string): Promise<ApiResponse<VehicleAssignmentItem[]>> {
    return apiRequest<VehicleAssignmentItem[]>(`/vehicles/${vehicleId}/assignments`);
  },

  async getEmployeeVehicleHistory(employeeId: string): Promise<ApiResponse<any[]>> {
    return apiRequest<any[]>(`/employees/${employeeId}/vehicle-history`);
  },
};
