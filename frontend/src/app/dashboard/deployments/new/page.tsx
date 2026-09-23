'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../components/DashboardLayout';
import {
  getDeploymentOptions,
  createDeployment,
  DeploymentOptionsResponse,
  CreateDeploymentPayload,
} from '../../../../lib/deployments-api';
import { useAuth } from '../../../../context/AuthContext';
import {
  UserCheck,
  Building2,
  MapPin,
  Truck,
  Briefcase,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  Moon,
} from 'lucide-react';

export default function NewDeploymentPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [options, setOptions] = useState<DeploymentOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [clientId, setClientId] = useState('');
  const [clientSiteId, setClientSiteId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [billingRateId, setBillingRateId] = useState('');
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState('');
  const [shiftName, setShiftName] = useState('GENERAL');
  const [shiftStartTime, setShiftStartTime] = useState('09:00');
  const [shiftEndTime, setShiftEndTime] = useState('18:00');
  const [isNightShift, setIsNightShift] = useState(false);
  const [scheduledWorkdays, setScheduledWorkdays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [remarks, setRemarks] = useState('');

  // Fetch initial lookup options
  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const res = await getDeploymentOptions(clientId || undefined, employeeId || undefined);
        if (res.success && res.data) {
          setOptions(res.data);
        } else {
          setErrorMessage(res.error?.message || 'Failed to load deployment dropdown metadata');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Network error loading options');
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, [clientId, employeeId]);

  // Derived cascade items
  const selectedClient = options?.clients.find((c) => c.id === clientId);
  const availableSites = selectedClient?.sites || [];
  const selectedEmployee = options?.employees.find((e) => e.id === employeeId);
  const availableSalaryStructures = selectedEmployee?.salaryStructures || [];

  // Filter billing rates for selected client, site, and designation
  const availableBillingRates = (options?.clientBillingRates || []).filter((r) => {
    if (designationId && r.designationId !== designationId) return false;
    if (clientSiteId && r.clientSiteId && r.clientSiteId !== clientSiteId) return false;
    return true;
  });

  // Automatically adjust isNightShift if endTime < startTime
  useEffect(() => {
    if (shiftStartTime && shiftEndTime && shiftEndTime < shiftStartTime) {
      setIsNightShift(true);
    }
  }, [shiftStartTime, shiftEndTime]);

  // Handle workday toggle
  const toggleWorkday = (day: number) => {
    if (scheduledWorkdays.includes(day)) {
      setScheduledWorkdays(scheduledWorkdays.filter((d) => d !== day));
    } else {
      setScheduledWorkdays([...scheduledWorkdays, day].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic frontend validations
    if (!employeeId) {
      setErrorMessage('Please select an active employee.');
      return;
    }
    if (!clientId) {
      setErrorMessage('Please select a client.');
      return;
    }
    if (!clientSiteId) {
      setErrorMessage('Please select a client site.');
      return;
    }
    if (!designationId) {
      setErrorMessage('Please select a deployment designation.');
      return;
    }
    if (!billingRateId) {
      setErrorMessage('Please select an applicable client billing rate.');
      return;
    }
    if (!salaryStructureId) {
      setErrorMessage('Please select an effective salary structure for this employee.');
      return;
    }
    if (!startDate) {
      setErrorMessage('Please specify deployment start date.');
      return;
    }
    if (endDate && endDate < startDate) {
      setErrorMessage('End date cannot be earlier than start date.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateDeploymentPayload = {
        employeeId,
        clientId,
        clientSiteId,
        designationId,
        billingRateId,
        salaryStructureId,
        vehicleId: vehicleId || undefined,
        startDate,
        endDate: endDate || undefined,
        shiftName: shiftName.trim() || 'GENERAL',
        shiftStartTime,
        shiftEndTime,
        isNightShift,
        scheduledWorkdays,
        remarks: remarks.trim() || undefined,
      };

      const res = await createDeployment(payload);
      if (res.success && res.data) {
        const newId = res.data.id;
        setSuccessMessage('Employee deployed successfully! Redirecting to deployment profile...');
        setTimeout(() => {
          router.push(`/dashboard/deployments/${newId}`);
        }, 1200);
      } else {
        setErrorMessage(res.error?.message || 'Failed to create deployment record');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server error creating deployment');
    } finally {
      setSubmitting(false);
    }
  };

  const daysLabels = [
    { day: 1, label: 'Mon' },
    { day: 2, label: 'Tue' },
    { day: 3, label: 'Wed' },
    { day: 4, label: 'Thu' },
    { day: 5, label: 'Fri' },
    { day: 6, label: 'Sat' },
    { day: 7, label: 'Sun' },
  ];

  return (
    <DashboardLayout
      title="Create New Deployment"
      subtitle="Establish immutable operational deployment connecting worker, client site, shift, and compensation"
      action={
        <Link
          href="/dashboard/deployments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} /> Back to Directory
        </Link>
      }
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {errorMessage && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}>
            <AlertCircle size={18} />
            <div>{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}>
            <CheckCircle2 size={18} />
            <div>{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 1: Employee & Designation */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', color: 'var(--text-primary)' }}>
              <UserCheck size={18} style={{ color: '#3b82f6' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>1. Worker & Designation</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              {/* Employee Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  ACTIVE EMPLOYEE *
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    setEmployeeId(empId);
                    setSalaryStructureId('');
                    const found = options?.employees.find(x => x.id === empId);
                    if (found?.primaryDesignationId) {
                      setDesignationId(found.primaryDesignationId);
                    }
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">-- Select Active Employee --</option>
                  {options?.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Designation Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  DEPLOYMENT DESIGNATION *
                </label>
                <select
                  value={designationId}
                  onChange={(e) => {
                    setDesignationId(e.target.value);
                    setBillingRateId('');
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">-- Select Deployment Designation --</option>
                  {options?.designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Deployment designation preserves operational role without mutating employee master profile.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Client, Site & Optional Fleet */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', color: 'var(--text-primary)' }}>
              <Building2 size={18} style={{ color: '#10b981' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>2. Client Location & Vehicle</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              {/* Client Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  CLIENT COMPANY *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setClientSiteId('');
                    setBillingRateId('');
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">-- Select Client --</option>
                  {options?.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.clientCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Site Selection (Cascading) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  CLIENT SITE *
                </label>
                <select
                  value={clientSiteId}
                  onChange={(e) => {
                    setClientSiteId(e.target.value);
                    setBillingRateId('');
                  }}
                  required
                  disabled={!clientId || availableSites.length === 0}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    opacity: !clientId ? 0.6 : 1,
                  }}
                >
                  <option value="">
                    {!clientId ? '-- Select Client First --' : availableSites.length === 0 ? '-- No Sites Registered --' : '-- Select Client Site --'}
                  </option>
                  {availableSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.siteName} ({s.siteCode} - {s.city || 'HQ'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Vehicle */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  OPERATIONAL VEHICLE (OPTIONAL)
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">-- None (Non-Vehicle Deployment) --</option>
                  {options?.vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleRegistrationNumber} ({v.vehicleMake} {v.vehicleModel} - {v.vehicleType})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Leave empty for security guards, helpers, and static site workers.
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Commercials & Compensation */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', color: 'var(--text-primary)' }}>
              <DollarSign size={18} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>3. Billing Rate & Salary Structure</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              {/* Billing Rate Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  CLIENT BILLING RATE CARD *
                </label>
                <select
                  value={billingRateId}
                  onChange={(e) => setBillingRateId(e.target.value)}
                  required
                  disabled={!clientId || availableBillingRates.length === 0}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">
                    {!clientId ? '-- Select Client First --' : availableBillingRates.length === 0 ? '-- No Rates Matching Designation/Site --' : '-- Select Billing Rate --'}
                  </option>
                  {availableBillingRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      ₹{r.rateAmount.toLocaleString('en-IN')} / {r.billingModel} (from {r.effectiveFrom ? r.effectiveFrom.substring(0, 10) : ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary Structure Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  EMPLOYEE SALARY STRUCTURE *
                </label>
                <select
                  value={salaryStructureId}
                  onChange={(e) => setSalaryStructureId(e.target.value)}
                  required
                  disabled={!employeeId || availableSalaryStructures.length === 0}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">
                    {!employeeId ? '-- Select Employee First --' : availableSalaryStructures.length === 0 ? '-- No Salary Structure Configured --' : '-- Select Salary Structure --'}
                  </option>
                  {availableSalaryStructures.map((s) => (
                    <option key={s.id} value={s.id}>
                      Basic: ₹{Number(s.basicPay).toLocaleString('en-IN')} (Effective from {s.effectiveFrom ? s.effectiveFrom.substring(0, 10) : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Shift & Timeline */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', color: 'var(--text-primary)' }}>
              <Clock size={18} style={{ color: '#a855f7' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>4. Shift Schedule & Deployment Timeline</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  SHIFT NAME *
                </label>
                <input
                  type="text"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="e.g. DAY_SHIFT, GENERAL"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  SHIFT START TIME
                </label>
                <input
                  type="time"
                  value={shiftStartTime}
                  onChange={(e) => setShiftStartTime(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  SHIFT END TIME
                </label>
                <input
                  type="time"
                  value={shiftEndTime}
                  onChange={(e) => setShiftEndTime(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  CROSS-MIDNIGHT (NIGHT)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isNightShift}
                    onChange={(e) => setIsNightShift(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Crosses Midnight</span>
                </label>
              </div>
            </div>

            {/* Scheduled Workdays */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                SCHEDULED WORKDAYS (ROSTER)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {daysLabels.map((d) => {
                  const active = scheduledWorkdays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => toggleWorkday(d.day)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: active ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                        background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: active ? '#3b82f6' : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  DEPLOYMENT START DATE *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  END DATE (OPTIONAL)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Leave empty for ongoing/indefinite deployment.
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div style={{ marginTop: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                AUDIT REMARKS / INSTRUCTIONS
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Specific shift handover remarks or client special instructions..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Link
              href="/dashboard/deployments"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--primary-500, #3b82f6), var(--accent-indigo, #6366f1))',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
              }}
            >
              {submitting ? 'Creating Deployment...' : 'Deploy Employee'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
