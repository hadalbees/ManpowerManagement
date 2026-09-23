import { apiRequest, ApiResponse } from './api';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AgencySettings {
  companyName: string;
  legalName?: string;
  logoUrl?: string;
  location: string;
  registeredAddress?: string;
  city?: string;
  stateCode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  website?: string;
}

const SETTINGS_STORAGE_KEY = 'apex_agency_settings';

export const DEFAULT_AGENCY_SETTINGS: AgencySettings = {
  companyName: 'Apex Manpower Solutions',
  legalName: 'Apex Manpower Services Private Limited',
  logoUrl: '',
  location: 'Tiruchirappalli Headquarters',
  registeredAddress: '124, Cantonment Main Road, Tiruchirappalli 620001',
  city: 'Tiruchirappalli',
  stateCode: '33',
  phone: '+91 94431 20001',
  email: 'admin@apexmanpower.in',
  gstin: '33AABCA1234F1Z5',
  pan: 'AABCA1234F',
  website: 'https://apexmanpower.in',
};

export const settingsApi = {
  /**
   * Change Current User Password via Backend Authentication Engine
   */
  async changePassword(payload: ChangePasswordPayload): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Load Agency Settings from local cache or fallback defaults
   */
  getAgencySettings(): AgencySettings {
    if (typeof window === 'undefined') return DEFAULT_AGENCY_SETTINGS;
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_AGENCY_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_AGENCY_SETTINGS;
  },

  /**
   * Save Agency Settings to persistent cache & broadcast update
   */
  saveAgencySettings(settings: AgencySettings): AgencySettings {
    if (typeof window === 'undefined') return settings;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('agency_settings_updated', { detail: settings }));
    } catch {
      // Storage error fallback
    }
    return settings;
  },
};
