import { apiRequest } from './api';

export const documentsApi = {
  getDocuments: (params?: { entityType?: string; entityId?: string; verificationStatus?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.entityType) q.append('entityType', params.entityType);
    if (params?.entityId) q.append('entityId', params.entityId);
    if (params?.verificationStatus) q.append('verificationStatus', params.verificationStatus);
    if (params?.search) q.append('search', params.search);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.limit) q.append('limit', params.limit.toString());
    return apiRequest(`/documents?${q.toString()}`);
  },
  uploadDocument: (data: any) => apiRequest('/documents/upload', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getDocumentVersions: (id: string) => apiRequest(`/documents/${id}/versions`),
  verifyDocument: (id: string, data: { status: 'VERIFIED' | 'REJECTED'; rejectionReason?: string }) => apiRequest(`/documents/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getDownloadUrl: (id: string, versionNumber?: number) => {
    const q = versionNumber ? `?version=${versionNumber}` : '';
    return apiRequest(`/documents/${id}/download${q}`);
  },
  deleteDocument: (id: string) => apiRequest(`/documents/${id}`, {
    method: 'DELETE',
  }),
};

export const complianceApi = {
  getDashboard: (params?: { branchId?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    return apiRequest(`/compliance/dashboard?${q.toString()}`);
  },
  getAlerts: (params?: { isAcknowledged?: boolean; entityType?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.isAcknowledged !== undefined) q.append('isAcknowledged', String(params.isAcknowledged));
    if (params?.entityType) q.append('entityType', params.entityType);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.limit) q.append('limit', params.limit.toString());
    return apiRequest(`/compliance/alerts?${q.toString()}`);
  },
  runExpiryCheck: () => apiRequest('/compliance/check-expiries', { method: 'POST' }),
  acknowledgeAlert: (id: string) => apiRequest(`/compliance/alerts/${id}/acknowledge`, { method: 'POST' }),
};

export const recruitmentApi = {
  getCandidates: (params?: { stage?: string; designationId?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.stage) q.append('stage', params.stage);
    if (params?.designationId) q.append('designationId', params.designationId);
    if (params?.search) q.append('search', params.search);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.limit) q.append('limit', params.limit.toString());
    return apiRequest(`/recruitment/candidates?${q.toString()}`);
  },
  getCandidate: (id: string) => apiRequest(`/recruitment/candidates/${id}`),
  createCandidate: (data: any) => apiRequest('/recruitment/candidates', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  addScreening: (id: string, data: any) => apiRequest(`/recruitment/candidates/${id}/screening`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  scheduleInterview: (id: string, data: any) => apiRequest(`/recruitment/candidates/${id}/interviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  evaluateInterview: (id: string, interviewId: string, data: any) => apiRequest(`/recruitment/candidates/${id}/interviews/${interviewId}/evaluate`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  recordSkillTest: (id: string, data: any) => apiRequest(`/recruitment/candidates/${id}/skill-tests`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  issueOffer: (id: string, data: any) => apiRequest(`/recruitment/candidates/${id}/offer`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateOfferStatus: (id: string, offerId: string, data: any) => apiRequest(`/recruitment/candidates/${id}/offer/${offerId}/status`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  convertToEmployee: (id: string, data: any) => apiRequest(`/recruitment/candidates/${id}/convert-to-employee`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export const notificationsApi = {
  getNotifications: (params?: { isRead?: boolean; priority?: string; category?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.isRead !== undefined) q.append('isRead', String(params.isRead));
    if (params?.priority) q.append('priority', params.priority);
    if (params?.category) q.append('category', params.category);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.limit) q.append('limit', params.limit.toString());
    return apiRequest(`/notifications?${q.toString()}`);
  },
  getUnreadCount: () => apiRequest('/notifications/unread-count'),
  markAsRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
};

export const reportsApi = {
  generateReport: (data: { reportType: string; branchId?: string; startDate?: string; endDate?: string; filters?: Record<string, any> }) => apiRequest('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  exportReport: (data: { reportType: string; branchId?: string; startDate?: string; endDate?: string; filters?: Record<string, any> }) => apiRequest('/reports/export', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export const analyticsApi = {
  getExecutiveOverview: () => apiRequest('/analytics/executive-overview'),
  getOperationsMetrics: (params?: { branchId?: string }) => {
    const q = params?.branchId ? `?branchId=${params.branchId}` : '';
    return apiRequest(`/analytics/operations-metrics${q}`);
  },
  getFinancialTrends: (params?: { branchId?: string; months?: number }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.months) q.append('months', params.months.toString());
    return apiRequest(`/analytics/financial-trends?${q.toString()}`);
  },
};
