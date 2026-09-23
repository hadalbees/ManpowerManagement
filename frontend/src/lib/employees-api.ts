import { apiRequest, ApiResponse } from './api';

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type EmploymentType = 'PERMANENT' | 'CONTRACT' | 'PROBATION' | 'TEMPORARY' | 'DAILY_WAGE';
export type SkillProficiency = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';

export interface DesignationItem {
  id: string;
  name: string;
  code: string;
  category: string;
  isActive: boolean;
}

export interface SkillMasterItem {
  id: string;
  name: string;
  code: string;
  category: string;
  isActive: boolean;
}

export interface EmployeeSkillItem {
  id: string;
  employeeId: string;
  skillId: string;
  proficiencyLevel: SkillProficiency;
  yearsOfExperience: number;
  isPrimary: boolean;
  createdAt: string;
  skill?: SkillMasterItem;
}

export interface EmployeeQualificationItem {
  id: string;
  employeeId: string;
  qualificationType: string;
  degreeDiploma: string;
  institution: string;
  boardUniversity: string;
  yearOfPassing: number;
  percentageCgpa?: number | null;
  certificateNumber?: string | null;
  createdAt: string;
}

export interface EmployeeSalaryStructureItem {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  basicSalary: number;
  hra: number;
  conveyanceAllowance: number;
  specialAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  tdsApplicable: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface EmployeeDocumentItem {
  id: string;
  title: string;
  documentType: string;
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  isVerified: boolean;
  fileUrl: string;
  createdAt: string;
}

export interface EmployeeItem {
  id: string;
  agencyId: string;
  branchId: string;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  maritalStatus?: MaritalStatus | null;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  currentAddress: string;
  permanentAddress: string;
  joiningDate: string;
  probationEndDate?: string | null;
  confirmationDate?: string | null;
  resignationDate?: string | null;
  lastWorkingDate?: string | null;
  designationId: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  uanNumber?: string | null;
  esicNumber?: string | null;
  bankAccountMasked?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  panMasked?: string | null;
  aadhaarMasked?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  drivingLicenseNumber?: string | null;
  drivingLicenseClass?: string | null;
  drivingLicenseIssueDate?: string | null;
  drivingLicenseExpiryDate?: string | null;
  drivingLicenseAuthority?: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    branchName: string;
    branchCode: string;
  };
  designation?: {
    id: string;
    name: string;
    code: string;
    category: string;
  };
}

export interface EmployeeDetailResponse extends EmployeeItem {
  skills: EmployeeSkillItem[];
  qualifications: EmployeeQualificationItem[];
  salaryStructures: EmployeeSalaryStructureItem[];
  documents: EmployeeDocumentItem[];
}

export interface EmployeeSensitiveResponse {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  panNumber: string | null;
  aadhaarNumber: string | null;
  unmaskedAt: string;
}

export interface EmployeeListResponse {
  items: EmployeeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const employeesApi = {
  async getEmployees(query: {
    search?: string;
    status?: string;
    branchId?: string;
    designationId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<EmployeeListResponse>> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.status && query.status !== 'ALL') params.append('status', query.status);
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.designationId) params.append('designationId', query.designationId);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const qs = params.toString();
    return apiRequest<EmployeeListResponse>(`/employees${qs ? `?${qs}` : ''}`);
  },

  async getEmployeeById(id: string): Promise<ApiResponse<EmployeeDetailResponse>> {
    return apiRequest<EmployeeDetailResponse>(`/employees/${id}`);
  },

  async getDesignations(): Promise<ApiResponse<DesignationItem[]>> {
    return apiRequest<DesignationItem[]>('/employees/designations');
  },

  async getSkills(): Promise<ApiResponse<SkillMasterItem[]>> {
    return apiRequest<SkillMasterItem[]>('/employees/skills');
  },

  async getSensitiveData(id: string, reason: string): Promise<ApiResponse<EmployeeSensitiveResponse>> {
    return apiRequest<EmployeeSensitiveResponse>(`/employees/${id}/sensitive?reason=${encodeURIComponent(reason)}`);
  },

  async createEmployee(data: any): Promise<ApiResponse<EmployeeItem>> {
    return apiRequest<EmployeeItem>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateEmployee(id: string, data: any): Promise<ApiResponse<EmployeeItem>> {
    return apiRequest<EmployeeItem>(`/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateEmployeeStatus(id: string, status: EmployeeStatus, remarks?: string): Promise<ApiResponse<EmployeeItem>> {
    return apiRequest<EmployeeItem>(`/employees/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
  },

  async deleteEmployee(id: string, reason?: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(`/employees/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  async addSkill(employeeId: string, data: {
    skillId: string;
    proficiencyLevel: SkillProficiency;
    yearsOfExperience: number;
    isPrimary?: boolean;
  }): Promise<ApiResponse<EmployeeSkillItem>> {
    return apiRequest<EmployeeSkillItem>(`/employees/${employeeId}/skills`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeSkill(employeeId: string, skillId: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(`/employees/${employeeId}/skills/${skillId}`, {
      method: 'DELETE',
    });
  },

  async addQualification(employeeId: string, data: {
    qualificationType: string;
    degreeDiploma: string;
    institution: string;
    boardUniversity: string;
    yearOfPassing: number;
    percentageCgpa?: number;
    certificateNumber?: string;
  }): Promise<ApiResponse<EmployeeQualificationItem>> {
    return apiRequest<EmployeeQualificationItem>(`/employees/${employeeId}/qualifications`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createSalaryStructure(employeeId: string, data: {
    effectiveFrom: string;
    basicSalary: number;
    hra?: number;
    conveyanceAllowance?: number;
    specialAllowance?: number;
    medicalAllowance?: number;
    otherAllowances?: number;
    pfApplicable?: boolean;
    esiApplicable?: boolean;
    ptApplicable?: boolean;
    tdsApplicable?: boolean;
  }): Promise<ApiResponse<EmployeeSalaryStructureItem>> {
    return apiRequest<EmployeeSalaryStructureItem>(`/employees/${employeeId}/salary-structures`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async reviseSalaryStructure(employeeId: string, data: {
    effectiveFrom: string;
    basicSalary: number;
    hra?: number;
    conveyanceAllowance?: number;
    specialAllowance?: number;
    medicalAllowance?: number;
    otherAllowances?: number;
    pfApplicable?: boolean;
    esiApplicable?: boolean;
    ptApplicable?: boolean;
    tdsApplicable?: boolean;
    revisionReason: string;
  }): Promise<ApiResponse<EmployeeSalaryStructureItem>> {
    return apiRequest<EmployeeSalaryStructureItem>(`/employees/${employeeId}/salary-structures/revise`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
