'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { leaveApi, LeaveBalance, LeaveType } from '@/lib/leave-api';
import { employeesApi, EmployeeItem } from '@/lib/employees-api';
import {
  Layers,
  Plus,
  Edit,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  User,
  Calendar,
  X,
} from 'lucide-react';

export default function LeaveBalancesPage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Adjust Balance Modal State
  const [adjustingBalance, setAdjustingBalance] = useState<LeaveBalance | null>(null);
  const [adjustmentDays, setAdjustmentDays] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Create Balance Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createEmployeeId, setCreateEmployeeId] = useState('');
  const [createLeaveTypeId, setCreateLeaveTypeId] = useState('');
  const [createOpeningDays, setCreateOpeningDays] = useState(12);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: any = {};
      if (selectedEmployee !== 'ALL') query.employeeId = selectedEmployee;
      if (selectedLeaveType !== 'ALL') query.leaveTypeId = selectedLeaveType;
      if (selectedYear) query.year = selectedYear;

      const [balRes, typeRes, empRes] = await Promise.all([
        leaveApi.getLeaveBalances(query),
        leaveApi.getLeaveTypes(),
        employeesApi.getEmployees({ limit: 100 }),
      ]);

      if (balRes.success && balRes.data) {
        setBalances(balRes.data);
      } else {
        setError(balRes.error?.message || 'Failed to load balances');
      }

      if (typeRes.success && typeRes.data) {
        setLeaveTypes(typeRes.data);
      }

      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items || []);
      }
    } catch {
      setError('An unexpected error occurred while loading leave balances');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee, selectedLeaveType, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdjust = async () => {
    if (!adjustingBalance) return;
    if (!adjustmentReason.trim()) {
      setError('Reason is mandatory for balance adjustments');
      return;
    }
    const newClosing = Number(adjustingBalance.closingBalance) + Number(adjustmentDays);
    if (newClosing < 0) {
      setError('Adjustment cannot result in a negative closing balance');
      return;
    }

    setAdjustSubmitting(true);
    setError(null);
    try {
      const res = await leaveApi.adjustLeaveBalance(adjustingBalance.id, {
        adjustmentDays: Number(adjustmentDays),
        reason: adjustmentReason,
      });

      if (res.success) {
        setSuccessMsg(`Leave balance adjusted successfully for ${adjustingBalance.employee?.firstName}!`);
        setAdjustingBalance(null);
        setAdjustmentDays(0);
        setAdjustmentReason('');
        loadData();
      } else {
        setError(res.error?.message || 'Adjustment failed');
      }
    } catch {
      setError('An error occurred during adjustment');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!createEmployeeId || !createLeaveTypeId) {
      setError('Please select both an employee and a leave type');
      return;
    }
    setCreateSubmitting(true);
    setError(null);
    try {
      const res = await leaveApi.createLeaveBalance({
        employeeId: createEmployeeId,
        leaveTypeId: createLeaveTypeId,
        year: selectedYear,
        openingBalance: Number(createOpeningDays),
      });

      if (res.success) {
        setSuccessMsg('Leave balance created successfully!');
        setIsCreateOpen(false);
        setCreateEmployeeId('');
        setCreateLeaveTypeId('');
        loadData();
      } else {
        setError(res.error?.message || 'Failed to create balance');
      }
    } catch {
      setError('An error occurred while creating balance');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Leave Balances"
      subtitle="Track allocated, accrued, consumed, and closing days per employee for the configured leave year"
      action={
        <button
          onClick={() => setIsCreateOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#ffffff',
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
            boxShadow: '0 4px 14px var(--primary-glow)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Allocate Balance
        </button>
      }
    >
      {/* Alert Messages */}
      {error && (
        <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} /> <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
          {/* Employee Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Filter by Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            >
              <option value="ALL">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>

          {/* Leave Type Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Filter by Leave Type</label>
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            >
              <option value="ALL">All Types</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
              ))}
            </select>
          </div>

          {/* Leave Year Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Leave Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            >
              <option value={2026}>2026-27 (Current Cycle)</option>
              <option value={2025}>2025-26 (Previous Cycle)</option>
              <option value={2027}>2027-28 (Next Cycle)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Balances Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading leave balances...</div>
        ) : balances.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No leave balances found. Use "Allocate Balance" to grant leave quota to employees.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Leave Year</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Allocated</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Used</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Available</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((bal) => {
                  const allocated = Number(bal.openingBalance) + Number(bal.accruedDays);
                  const used = Number(bal.consumedDays);
                  const available = Number(bal.closingBalance);
                  return (
                    <tr key={bal.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          {bal.employee?.firstName} {bal.employee?.lastName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {bal.employee?.employeeCode} • {bal.employee?.branch?.branchName || 'HQ'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: bal.leaveType?.isPaid ? 'rgba(59, 130, 246, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: bal.leaveType?.isPaid ? '#60a5fa' : '#f87171' }}>
                          {bal.leaveType?.name} ({bal.leaveType?.code})
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {bal.year}-{String(bal.year + 1).slice(-2)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {allocated.toFixed(1)}d
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#f87171' }}>
                        {used.toFixed(1)}d
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: available > 0 ? '#34d399' : '#9ca3af' }}>
                          {available.toFixed(1)}d
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => {
                            setAdjustingBalance(bal);
                            setAdjustmentDays(0);
                            setAdjustmentReason('');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--primary-400)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit size={12} /> Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustingBalance && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Adjust Leave Balance
              </h3>
              <button onClick={() => setAdjustingBalance(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Adjusting <strong>{adjustingBalance.leaveType?.name}</strong> balance for{' '}
              <strong>{adjustingBalance.employee?.firstName} {adjustingBalance.employee?.lastName}</strong>.
            </p>

            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Available</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {Number(adjustingBalance.closingBalance).toFixed(1)} days
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>New Available</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: Number(adjustingBalance.closingBalance) + Number(adjustmentDays) >= 0 ? '#34d399' : '#f43f5e' }}>
                  {(Number(adjustingBalance.closingBalance) + Number(adjustmentDays)).toFixed(1)} days
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Adjustment (+ to add, - to deduct)
              </label>
              <input
                type="number"
                step="0.5"
                value={adjustmentDays}
                onChange={(e) => setAdjustmentDays(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.9375rem' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Adjustment Reason (Audited) <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Annual incentive or correction"
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setAdjustingBalance(null)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '8px' }}>Cancel</button>
              <button
                onClick={handleAdjust}
                disabled={adjustSubmitting || !adjustmentReason.trim() || Number(adjustingBalance.closingBalance) + Number(adjustmentDays) < 0}
                style={{ padding: '10px 20px', background: 'var(--primary-600)', color: '#fff', border: 'none', fontWeight: 700, borderRadius: '8px' }}
              >
                {adjustSubmitting ? 'Saving...' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Balance Modal */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Allocate Leave Balance
              </h3>
              <button onClick={() => setIsCreateOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Employee</label>
              <select
                value={createEmployeeId}
                onChange={(e) => setCreateEmployeeId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
              >
                <option value="">Select Employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Leave Type</label>
              <select
                value={createLeaveTypeId}
                onChange={(e) => setCreateLeaveTypeId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
              >
                <option value="">Select Leave Type...</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Opening Balance (Days)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={createOpeningDays}
                onChange={(e) => setCreateOpeningDays(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsCreateOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '8px' }}>Cancel</button>
              <button
                onClick={handleCreate}
                disabled={createSubmitting || !createEmployeeId || !createLeaveTypeId}
                style={{ padding: '10px 20px', background: 'var(--primary-600)', color: '#fff', border: 'none', fontWeight: 700, borderRadius: '8px' }}
              >
                {createSubmitting ? 'Allocating...' : 'Allocate Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
