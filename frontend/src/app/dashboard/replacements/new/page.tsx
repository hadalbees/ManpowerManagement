'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { replacementsApi, ReplacementType } from '@/lib/replacements-api';
import { getDeployments, DeploymentItem } from '@/lib/deployments-api';
import { employeesApi, EmployeeItem } from '@/lib/employees-api';
import {
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Truck,
  HelpCircle,
} from 'lucide-react';

export default function NewReplacementPage() {
  const router = useRouter();

  // Data sources
  const [deployments, setDeployments] = useState<DeploymentItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [selectedDeploymentId, setSelectedDeploymentId] = useState('');
  const [replacementEmployeeId, setReplacementEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [replacementType, setReplacementType] = useState<ReplacementType>('TEMPORARY');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoadingInitial(true);
      try {
        const [depRes, empRes] = await Promise.all([
          getDeployments({ status: 'ACTIVE', limit: 100 }),
          employeesApi.getEmployees({ status: 'ACTIVE', limit: 150 }),
        ]);

        if (depRes.success && depRes.data) {
          setDeployments(depRes.data.items || []);
        }
        if (empRes.success && empRes.data) {
          setEmployees(empRes.data.items || []);
        }
      } catch (err: any) {
        setError('Failed to fetch initial deployment and employee listings');
      } finally {
        setLoadingInitial(false);
      }
    }
    fetchData();
  }, []);

  const selectedDeployment = deployments.find((d) => d.id === selectedDeploymentId);
  const absentEmployee = selectedDeployment?.employee;
  const selectedReplacementEmp = employees.find((e) => e.id === replacementEmployeeId);

  // Live Pre-validation Checks
  const isDriverDeployment =
    Boolean(selectedDeployment?.vehicleId) ||
    selectedDeployment?.designation?.category === 'DRIVER';

  const isSamePerson = absentEmployee && selectedReplacementEmp && absentEmployee.id === selectedReplacementEmp.id;
  const isDateInvalid = endDate < startDate;

  const depStartStr = selectedDeployment ? new Date(selectedDeployment.startDate).toISOString().slice(0, 10) : null;
  const depEndStr = selectedDeployment?.endDate ? new Date(selectedDeployment.endDate).toISOString().slice(0, 10) : null;

  const isStartTooEarly = depStartStr && startDate < depStartStr;
  const isEndTooLate = depEndStr && endDate > depEndStr;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeployment || !absentEmployee) {
      setError('Please select an active deployment');
      return;
    }
    if (!replacementEmployeeId) {
      setError('Please select a replacement employee');
      return;
    }
    if (isSamePerson) {
      setError('An employee cannot be dispatched to replace themselves');
      return;
    }
    if (isDateInvalid) {
      setError('End date cannot be earlier than start date');
      return;
    }
    if (isStartTooEarly) {
      setError(`Start date cannot be earlier than deployment start (${depStartStr})`);
      return;
    }
    if (isEndTooLate) {
      setError(`End date cannot exceed deployment end (${depEndStr})`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await replacementsApi.create({
        originalDeploymentId: selectedDeployment.id,
        absentEmployeeId: absentEmployee.id,
        replacementEmployeeId,
        startDate,
        endDate,
        replacementType,
        reason: reason || undefined,
      });

      if (res.success && res.data) {
        router.push(`/dashboard/replacements/requests/${res.data.id}`);
      } else {
        setError(res.error?.message || 'Failed to dispatch replacement worker');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Dispatch Replacement Worker"
      subtitle="Assign an eligible replacement worker to an active deployment shift"
      action={
        <Link
          href="/dashboard/replacements"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} /> Cancel
        </Link>
      }
    >
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Core Invariant Reminder */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(99, 102, 241, 0.08))',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#ffffff' }}>
              Non-Destructive Replacement Engine
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Dispatching a replacement creates an operational shift overlay. The permanent deployment assignment and historical attendance remain intact.
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loadingInitial ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Loading active deployments and available manpower...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. Target Deployment Selection */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>
                1. Select Active Deployment & Absent Employee
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                Choose the client assignment where the original employee needs temporary shift coverage.
              </p>

              <select
                required
                value={selectedDeploymentId}
                onChange={(e) => setSelectedDeploymentId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="">-- Choose Active Deployment --</option>
                {deployments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.client?.companyName} ({d.clientSite?.siteName}) | Absent: {d.employee?.firstName} {d.employee?.lastName} ({d.employee?.employeeCode}) | {d.shiftName}
                  </option>
                ))}
              </select>

              {selectedDeployment && absentEmployee && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Absent Worker: </span>
                    <strong style={{ color: '#fca5a5' }}>
                      {absentEmployee.firstName} {absentEmployee.lastName} ({absentEmployee.employeeCode})
                    </strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '12px' }}>Role: </span>
                    <span style={{ color: '#ffffff' }}>{selectedDeployment.designation?.name || 'Security'}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Deployment active: {depStartStr} {depEndStr ? `to ${depEndStr}` : '(ongoing)'}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Replacement Worker Selection */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>
                2. Select Replacement Employee
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                Choose an active, eligible worker with no active deployment or leave conflicts.
              </p>

              <select
                required
                value={replacementEmployeeId}
                onChange={(e) => setReplacementEmployeeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="">-- Choose Eligible Worker --</option>
                {employees
                  .filter((emp) => emp.id !== absentEmployee?.id)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode}) - {emp.branch?.branchName || 'HQ'}
                      {emp.drivingLicenseNumber ? ` | DL: ${emp.drivingLicenseNumber}` : ''}
                    </option>
                  ))}
              </select>

              {selectedReplacementEmp && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned Replacement: </span>
                    <strong style={{ color: '#34d399' }}>
                      {selectedReplacementEmp.firstName} {selectedReplacementEmp.lastName} ({selectedReplacementEmp.employeeCode})
                    </strong>
                  </div>
                  <div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    >
                      ACTIVE
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Schedule & Assignment Details */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 16px 0' }}>
                3. Replacement Schedule & Operational Reason
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Shift Start Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Shift End Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Replacement Type:
                  </label>
                  <select
                    value={replacementType}
                    onChange={(e) => setReplacementType(e.target.value as ReplacementType)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="TEMPORARY">TEMPORARY (Standard Shift Cover)</option>
                    <option value="EMERGENCY">EMERGENCY (Same-Day Immediate Dispatch)</option>
                    <option value="PERMANENT">PERMANENT (Transition Replacement)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Operational Reason / Comments:
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  placeholder="e.g. Guard Ramesh is on 5-day approved medical leave; Suresh dispatched to maintain post compliance."
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {/* 4. Real-time Pre-dispatch Eligibility Checklist */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px 24px',
              }}
            >
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', margin: '0 0 12px 0' }}>
                Pre-Dispatch Eligibility Verification
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color={selectedDeployment ? '#34d399' : 'var(--text-muted)'} />
                  <span style={{ color: selectedDeployment ? '#ffffff' : 'var(--text-muted)' }}>
                    Active client deployment selected ({selectedDeployment?.client?.companyName || 'None'})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color={selectedReplacementEmp && !isSamePerson ? '#34d399' : 'var(--text-muted)'} />
                  <span style={{ color: selectedReplacementEmp && !isSamePerson ? '#ffffff' : 'var(--text-muted)' }}>
                    Distinct active replacement worker chosen ({selectedReplacementEmp?.employeeCode || 'None'})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color={!isDateInvalid && !isStartTooEarly && !isEndTooLate ? '#34d399' : '#f87171'} />
                  <span style={{ color: !isDateInvalid && !isStartTooEarly && !isEndTooLate ? '#ffffff' : '#fca5a5' }}>
                    Dates within deployment boundary ({startDate} to {endDate})
                  </span>
                </div>
                {isDriverDeployment && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color={selectedReplacementEmp?.drivingLicenseNumber ? '#34d399' : '#f87171'} />
                    <span style={{ color: selectedReplacementEmp?.drivingLicenseNumber ? '#ffffff' : '#fca5a5' }}>
                      Driver role requires valid commercial driving license ({selectedReplacementEmp?.drivingLicenseNumber ? 'Verified' : 'No License on File!'})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Link
                href="/dashboard/replacements"
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: 'var(--primary-600)',
                  color: '#ffffff',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
              >
                {submitting ? 'Dispatching...' : 'Dispatch Replacement Worker'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
