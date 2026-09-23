'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';
import { settingsApi, AgencySettings, DEFAULT_AGENCY_SETTINGS } from '../lib/settings-api';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: {
    id: string;
    name: string;
    slug: string;
  };
  agency: {
    id: string;
    name: string;
    registrationNumber: string;
  };
  branch: {
    id: string;
    name: string;
    code: string;
  } | null;
  effectivePermissions: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  agencySettings: AgencySettings;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  refreshUser: () => Promise<void>;
  updateAgencySettings: (settings: Partial<AgencySettings>) => void;
  updateUserProfile: (profile: { fullName?: string; phone?: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [agencySettings, setAgencySettingsState] = useState<AgencySettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        return settingsApi.getAgencySettings();
      } catch {
        return DEFAULT_AGENCY_SETTINGS;
      }
    }
    return DEFAULT_AGENCY_SETTINGS;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and listen to dynamic agency settings
  useEffect(() => {
    const initialSettings = settingsApi.getAgencySettings();
    setAgencySettingsState(initialSettings);

    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setAgencySettingsState(e.detail);
      }
    };

    window.addEventListener('agency_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('agency_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiRequest<UserProfile>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
        const agencyName = res.data.agency?.name;
        if (agencyName) {
          setAgencySettingsState((prev) => ({
            ...prev,
            companyName: prev.companyName === DEFAULT_AGENCY_SETTINGS.companyName ? agencyName : prev.companyName,
          }));
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
      }
    } catch {
      // Network or silent error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load active profile from /auth/me on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const updateAgencySettings = (newSettings: Partial<AgencySettings>) => {
    setAgencySettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      settingsApi.saveAgencySettings(updated);
      return updated;
    });
  };

  const updateUserProfile = (profile: { fullName?: string; phone?: string }) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        fullName: profile.fullName ?? prev.fullName,
        phone: profile.phone ?? prev.phone,
      };
    });
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setIsLoading(false);

    if (res.success && res.data) {
      localStorage.setItem('access_token', res.data.accessToken);
      localStorage.setItem('refresh_token', res.data.refreshToken);
      setUser(res.data.user);
      return { success: true };
    } else {
      return {
        success: false,
        error: res.error?.message || 'Login failed',
        code: res.error?.code || 'AUTH_ERROR',
      };
    }
  };

  const logout = async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (refreshToken) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Logout cleanup regardless of server response
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    if (user.role.slug === 'super-admin') return true;
    return user.effectivePermissions.includes(permissionCode.toUpperCase());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        agencySettings,
        isLoading,
        login,
        logout,
        hasPermission,
        refreshUser,
        updateAgencySettings,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
