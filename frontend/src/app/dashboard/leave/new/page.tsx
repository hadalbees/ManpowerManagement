'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { leaveApi, LeaveType, LeaveBalance } from '@/lib/leave-api';
import { employeesApi, EmployeeItem } from '@/lib/employees-api';
import {
  CalendarDays,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Info,
  Send,
} from 'lucide-react';

export default function NewLeaveApplicationPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [empRes, typeRes, balRes] = await Promise.all([
          employeesApi.getEmployees({ limit: 100 }),
          leaveApi.getLeaveTypes(true),
          leaveApi.getLeaveBalances(),
        ]);

        if (empRes.success && empRes.data) {
          setEmployees(empRes.data.items || []);
        }
        if (typeRes.success && typeRes.data) {
          setLeaveTypes(typeRes.data);
        }
        if (balRes.success && balRes.data) {
          setBalances(balRes.data);
        }
      } catch {
        setError('Failed to load form prerequisites');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // Half-Day Sync
  const handleHalfDayToggle = (checked: boolean) => {
    setIsHalfDay(checked);
    if (checked && startDate) {
      setEndDate(startDate);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (isHalfDay || !endDate || endDate < val) {
      setEndDate(val);
    }
  };

  // Preview Day Count (Non-authoritative client preview)
  const calculateDaysPreview = () => {
    if (!startDate || !endDate) return 0;
    if (isHalfDay) return 0.5;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (end < start) return 0;
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const daysPreview = calculateDaysPreview();

  // Find available balance for selected employee and leave type
  const activeBalance = balances.find(
    (b) => b.employeeId === employeeId && b.leaveTypeId === leaveTypeId,
  );
  const selectedTypeObj = leaveTypes.find((t) => t.id === leaveTypeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason.trim()) {
      setError('Please fill in all mandatory fields');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be prior to start date');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await leaveApi.createLeaveRequest({
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        isHalfDay,
        reason,
      });

      if (res.success && res.data) {
        router.push(`/dashboard/leave/requests/${res.data.id}`);
      } else {
        setError(res.error?.message || 'Submission failed');
      }
    } catch {
      setError('An unexpected error occurred during submission');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Apply for Leave"
      subtitle="Submit an authoritative leave application with automated balance verification and date validation"
      action={
        <Link
          href="/dashboard/leave"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
          }}
        >
          <ArrowLeft size={16} /> Back
        </Link>
      }
    >
      {error && (
        <div style={{ marginBottom: '24px', padding: '16px 20px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} /> <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px', alignItems: 'start' }}>
        {/* Form Container */}
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>
            Application Details
          </h2>

          {/* Employee Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Employee <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.9375rem' }}
            >
              <option value="">Select Employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Leave Type <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.9375rem' }}
            >
              <option value="">Select Leave Type...</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} ({lt.code}) — {lt.isPaid ? 'Paid' : 'Unpaid LOP'}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Start Date <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.9375rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                End Date <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isHalfDay}
                required
                style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: isHalfDay ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '0.9375rem' }}
              />
            </div>
          </div>

          {/* Half-Day Toggle */}
          <div style={{ marginBottom: '24px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Half-Day Leave</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.5 day duration (forces single date)</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isHalfDay}
                onChange={(e) => handleHalfDayToggle(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '24px',
                  background: isHalfDay ? 'var(--primary-500)' : 'rgba(255,255,255,0.2)',
                  transition: '0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: isHalfDay ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    transition: '0.2s',
                  }}
                />
              </span>
            </label>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Reason for Absence <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context for the absence (e.g. personal exigency, medical appointment)"
              rows={4}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: 1.5 }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
              color: '#ffffff',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px var(--primary-glow)',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            <Send size={18} /> {submitting ? 'Submitting Application...' : 'Submit Leave Request'}
          </button>
        </form>

        {/* Informational Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Days Preview Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Duration Preview
            </h3>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary-400)', marginBottom: '4px' }}>
              {daysPreview} {daysPreview === 1 ? 'day' : 'days'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} /> Authoritative days calculated server-side upon submit
            </div>
          </div>

          {/* Balance Status Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Available Balance
            </h3>
            {selectedTypeObj?.isPaid ? (
              activeBalance ? (
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: Number(activeBalance.closingBalance) >= daysPreview ? '#34d399' : '#f43f5e', marginBottom: '6px' }}>
                    {Number(activeBalance.closingBalance).toFixed(1)} days available
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Year {activeBalance.year}-{String(activeBalance.year + 1).slice(-2)} • {Number(activeBalance.consumedDays).toFixed(1)} already consumed
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {employeeId && leaveTypeId
                    ? 'No balance allocated for this employee/type in current year.'
                    : 'Select employee and leave type to view balance.'}
                </div>
              )
            ) : selectedTypeObj ? (
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa', marginBottom: '6px' }}>
                  Loss of Pay (LOP)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Unpaid leave does not consume paid balance pool.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Select leave type to view policy.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
