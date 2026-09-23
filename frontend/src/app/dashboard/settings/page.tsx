'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../../components/ui';
import { settingsApi, AgencySettings } from '../../../lib/settings-api';
import { 
  Building2, User, KeyRound, Shield, CheckCircle2, 
  AlertCircle, Save, Upload, Eye, EyeOff, Layers, MapPin, 
  Mail, Phone, FileText, Globe
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { user, agencySettings, updateAgencySettings, updateUserProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'branding' | 'profile' | 'security'>('branding');

  // Agency Branding State
  const [brandingForm, setBrandingForm] = useState<AgencySettings>(agencySettings);
  const [brandingSaved, setBrandingSaved] = useState(false);

  // Profile State
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // Password / Security State
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Sync initial user details when loaded
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Sync agency settings
  useEffect(() => {
    setBrandingForm(agencySettings);
  }, [agencySettings]);

  // Handle Save Branding
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateAgencySettings(brandingForm);
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 3000);
  };

  // Handle Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      fullName: profileForm.fullName,
      phone: profileForm.phone,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySuccess(null);
    setSecurityError(null);

    if (securityForm.newPassword.length < 8) {
      setSecurityError('New password must be at least 8 characters long');
      return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setSecurityError('New password and confirm password do not match');
      return;
    }

    setSecurityLoading(true);
    try {
      const res = await settingsApi.changePassword({
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword,
      });

      if (res.success) {
        setSecuritySuccess(res.data?.message || 'Password updated successfully in backend authentication store.');
        setSecurityForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setSecurityError(res.error?.message || 'Failed to update password. Please check your current password.');
      }
    } catch {
      setSecurityError('A network error occurred while communicating with the security engine.');
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Admin Settings & Agency Configuration"
        subtitle="Manage agency corporate identity, dynamic company name, branding logos, operating location, user profiles, and security credentials"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin Settings' },
        ]}
      />

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          style={{
            padding: '10px 18px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'branding' ? '2px solid var(--primary-500)' : '2px solid transparent',
            color: activeTab === 'branding' ? 'var(--primary-600)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Building2 size={16} />
          <span>Agency & Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '10px 18px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '2px solid var(--primary-500)' : '2px solid transparent',
            color: activeTab === 'profile' ? 'var(--primary-600)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <User size={16} />
          <span>Administrator Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            padding: '10px 18px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'security' ? '2px solid var(--primary-500)' : '2px solid transparent',
            color: activeTab === 'security' ? 'var(--primary-600)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <KeyRound size={16} />
          <span>Security & Password</span>
        </button>
      </div>

      {/* TAB 1: AGENCY & BRANDING */}
      {activeTab === 'branding' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start' }}>
          {/* Main Form */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Corporate Identity & Operational Scope
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Updates to company name, location, and logo update dynamically across the sidebar, header, login screen, and billing documents.
              </p>
            </div>

            {brandingSaved && (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-emerald-bg)',
                  border: '1px solid var(--accent-emerald-border)',
                  color: 'var(--accent-emerald-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} />
                <span>Agency branding and location settings updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveBranding}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Company Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={brandingForm.companyName}
                    onChange={(e) => setBrandingForm({ ...brandingForm, companyName: e.target.value })}
                    className="input"
                    placeholder="e.g. Apex Global Manpower Solutions"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Legal Registered Entity Name
                  </label>
                  <input
                    type="text"
                    value={brandingForm.legalName || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, legalName: e.target.value })}
                    className="input"
                    placeholder="e.g. Apex Manpower Services Pvt Ltd"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Agency Logo (Upload Image or Enter URL)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <label
                    className="btn-secondary"
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    <Upload size={14} />
                    <span>Upload Logo File</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const dataUrl = event.target?.result as string;
                            setBrandingForm((prev) => ({ ...prev, logoUrl: dataUrl }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <input
                    type="url"
                    value={brandingForm.logoUrl?.startsWith('data:') ? '' : (brandingForm.logoUrl || '')}
                    onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                    className="input"
                    style={{ flex: '1 1 240px' }}
                    placeholder="Or paste image URL (https://...)"
                  />

                  {brandingForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setBrandingForm({ ...brandingForm, logoUrl: '' })}
                      className="btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--accent-rose-text)' }}
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {brandingForm.logoUrl?.startsWith('data:') ? 'Custom image loaded from computer.' : 'Supports PNG, JPG, SVG, WebP. Applied across Login screen, Sidebar, and Billing headers.'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Headquarters / Primary Operating Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={brandingForm.location}
                    onChange={(e) => setBrandingForm({ ...brandingForm, location: e.target.value })}
                    className="input"
                    placeholder="e.g. Tiruchirappalli Headquarters"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    City & State
                  </label>
                  <input
                    type="text"
                    value={brandingForm.city || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, city: e.target.value })}
                    className="input"
                    placeholder="e.g. Tiruchirappalli, Tamil Nadu (State Code: 33)"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Registered Physical Address
                </label>
                <textarea
                  rows={2}
                  value={brandingForm.registeredAddress || ''}
                  onChange={(e) => setBrandingForm({ ...brandingForm, registeredAddress: e.target.value })}
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Street Address, Pincode"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Official Contact Phone
                  </label>
                  <input
                    type="text"
                    value={brandingForm.phone || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, phone: e.target.value })}
                    className="input"
                    placeholder="+91 94431 20001"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={brandingForm.email || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, email: e.target.value })}
                    className="input"
                    placeholder="admin@apexmanpower.in"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={brandingForm.gstin || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, gstin: e.target.value })}
                    className="input"
                    placeholder="33AABCA1234F1Z5"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Save size={16} />
                <span>Save Branding & Agency Settings</span>
              </button>
            </form>
          </div>

          {/* Real-time Preview Panel */}
          <div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                <Eye size={15} style={{ color: 'var(--accent-blue)' }} />
                <span>Live Interface Preview</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                This is how your agency brand and headquarters badge appear across the application.
              </div>

              {/* Sidebar Header Preview */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary-charcoal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {brandingForm.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brandingForm.logoUrl} alt="Preview Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Layers size={18} />
                  )}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {brandingForm.companyName || 'Company Name'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {brandingForm.location || 'Headquarters'}
                  </div>
                </div>
              </div>

              {/* Location Badge Preview */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '16px',
                }}
              >
                <MapPin size={13} style={{ color: 'var(--accent-blue)' }} />
                <span>{brandingForm.location || 'Headquarters'}</span>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                GSTIN: <code>{brandingForm.gstin || 'Pending'}</code> • State Code: <code>{brandingForm.stateCode || '33'}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMINISTRATOR PROFILE */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: '680px' }} className="card">
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Administrator User Profile
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Manage your user display name, communication coordinates, and operational role.
              </p>
            </div>

            {profileSaved && (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-emerald-bg)',
                  border: '1px solid var(--accent-emerald-border)',
                  color: 'var(--accent-emerald-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} />
                <span>Administrator profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Full Name / Username *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="input"
                  placeholder="Super Administrator"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Work Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={profileForm.email}
                  className="input"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Official sign-in email identifier linked to primary agency tenant.
                </span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="input"
                  placeholder="+91 94431 00000"
                />
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  System Role & RBAC Clearance
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--accent-blue-text)', fontWeight: 600 }}>
                  {user?.role?.name || 'Super Admin / Agency Owner'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Unrestricted system-wide governance with full authority across billing, payroll, statutory calculations, and fleet deployments.
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Save size={16} />
                <span>Save Profile Changes</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: '580px' }} className="card">
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Update Administrator Password
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Directly updates your password hash in the backend authentication store (`POST /api/v1/auth/change-password`).
              </p>
            </div>

            {securitySuccess && (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-emerald-bg)',
                  border: '1px solid var(--accent-emerald-border)',
                  color: 'var(--accent-emerald-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.84rem',
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{securitySuccess}</span>
              </div>
            )}

            {securityError && (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-rose-bg)',
                  border: '1px solid var(--accent-rose-border)',
                  color: 'var(--accent-rose-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.84rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{securityError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              {/* Current Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Current Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                    className="input"
                    style={{ width: '100%', paddingRight: '40px' }}
                    placeholder="Enter existing password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    className="input"
                    style={{ width: '100%', paddingRight: '40px' }}
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '6px', fontSize: '0.72rem', color: securityForm.newPassword.length >= 8 ? 'var(--accent-emerald-text)' : 'var(--text-muted)' }}>
                  <Shield size={12} />
                  <span>Must be at least 8 characters in length</span>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Confirm New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={securityForm.confirmPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                    className="input"
                    style={{ width: '100%', paddingRight: '40px' }}
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={securityLoading}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <KeyRound size={16} />
                <span>{securityLoading ? 'Verifying & Updating...' : 'Update Password in Auth Engine'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
