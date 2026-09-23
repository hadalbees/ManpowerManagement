import { apiRequest, ApiResponse } from './api';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';
export type AttendanceMethod = 'WEB_MANUAL' | 'MOBILE_APP' | 'BIOMETRIC_DEVICE' | 'BULK_IMPORT';

export interface AttendanceRecord {
  id: string;
  agencyId: string;
  branchId: string;
  employeeId: string;
  deploymentId: string;
  clientId: string;
  clientSiteId: string;
  shiftBusinessDate: string;
  clockInTime?: string | null;
  clockOutTime?: string | null;
  status: AttendanceStatus;
  scheduledHours: number;
  workedHours: number;
  overtimeHours: number;
  recordedMethod: AttendanceMethod;
  recordedById?: string | null;
  supervisorRemarks?: string | null;
  isApproved: boolean;
  approvedById?: string | null;
  approvedAt?: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  deployment?: {
    id: string;
    shiftName: string;
    isNightShift: boolean;
    startDate: string;
    endDate?: string | null;
    status: string;
    designation?: {
      id: string;
      name: string;
      category: string;
    };
  };
  client?: {
    id: string;
    clientCode: string;
    companyName: string;
  };
  clientSite?: {
    id: string;
    siteCode: string;
    siteName: string;
    city?: string;
  };
  recordedBy?: {
    id: string;
    fullName: string;
  };
  approvedBy?: {
    id: string;
    fullName: string;
  };
}

export interface AttendanceQuery {
  page?: number;
  limit?: number;
  branchId?: string;
  clientId?: string;
  clientSiteId?: string;
  deploymentId?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  isApproved?: boolean;
  isLocked?: boolean;
}

export interface AttendanceListResponse {
  items: AttendanceRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RecordAttendancePayload {
  employeeId: string;
  deploymentId?: string;
  shiftBusinessDate: string;
  clockInTime?: string;
  clockOutTime?: string;
  status: AttendanceStatus;
  scheduledHours?: number;
  workedHours?: number;
  overtimeHours?: number;
  recordedMethod?: AttendanceMethod;
  supervisorRemarks?: string;
}

export interface BulkRecordAttendancePayload {
  shiftBusinessDate: string;
  records: Array<{
    employeeId: string;
    deploymentId?: string;
    clockInTime?: string;
    clockOutTime?: string;
    status: AttendanceStatus;
    scheduledHours?: number;
    workedHours?: number;
    overtimeHours?: number;
    supervisorRemarks?: string;
  }>;
}

export interface MusterRollItem {
  deploymentId: string;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  designation?: {
    id: string;
    name: string;
    category: string;
  };
  vehicle?: {
    id: string;
    vehicleRegistrationNumber: string;
  } | null;
  shiftName: string;
  isNightShift: boolean;
  isScheduledWorkday: boolean;
  attendance?: AttendanceRecord | null;
}

export interface DailyMusterRollResponse {
  siteId: string;
  date: string;
  dayOfWeek: number;
  totalDeployments: number;
  recordedCount: number;
  muster: MusterRollItem[];
}

export async function fetchAttendanceRecords(
  query: AttendanceQuery = {},
): Promise<ApiResponse<AttendanceListResponse>> {
  const queryParams = new URLSearchParams();
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      queryParams.append(key, String(val));
    }
  });
  const queryString = queryParams.toString();
  return apiRequest<AttendanceListResponse>(
    `/attendance${queryString ? `?${queryString}` : ''}`,
  );
}

export async function fetchAttendanceById(
  id: string,
): Promise<ApiResponse<AttendanceRecord>> {
  return apiRequest<AttendanceRecord>(`/attendance/${id}`);
}

export async function recordAttendance(
  payload: RecordAttendancePayload,
): Promise<ApiResponse<AttendanceRecord>> {
  return apiRequest<AttendanceRecord>('/attendance', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function bulkRecordAttendance(
  payload: BulkRecordAttendancePayload,
): Promise<ApiResponse<{ recordedCount: number; failedCount: number; results: AttendanceRecord[]; errors: any[] }>> {
  return apiRequest('/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAttendance(
  id: string,
  payload: Partial<RecordAttendancePayload>,
): Promise<ApiResponse<AttendanceRecord>> {
  return apiRequest<AttendanceRecord>(`/attendance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function approveAttendance(
  id: string,
  payload: { isApproved: boolean; supervisorRemarks?: string },
): Promise<ApiResponse<AttendanceRecord>> {
  return apiRequest<AttendanceRecord>(`/attendance/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchDailyMusterRoll(
  siteId: string,
  date: string,
): Promise<ApiResponse<DailyMusterRollResponse>> {
  return apiRequest<DailyMusterRollResponse>(
    `/attendance/daily-muster?siteId=${encodeURIComponent(siteId)}&date=${encodeURIComponent(date)}`,
  );
}
