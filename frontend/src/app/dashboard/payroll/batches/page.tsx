'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { payrollApi, PayrollBatch, PayrollBatchStatus } from '@/lib/payroll-api';
import {
  Layers,
  Plus,
  Calendar,
  Lock,
  FileCheck,
  AlertCircle,
  Building2,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';

export default function PayrollBatchesPage() {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMonth, setNewMonth] = useState<number>(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [newBranchId, setNewBranchId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollApi.getBatches({
        year: yearFilter,
        status: statusFilter !== 'ALL' ? (statusFilter as PayrollBatchStatus) : undefined,
        limit: 50,
      });
      if (res.success && res.data) {
        setBatches(res.data.items || []);
      } else {
        setError(res.error?.message || 'Failed to load payroll batches');
      }
    } catch {
      setError('An unexpected error occurred while fetching batches');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, yearFilter]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      const res = await payrollApi.createBatch({
        branchId: newBranchId || 'default-branch',
        month: Number(newMonth),
        year: Number(newYear),
      });
      if (res.success) {
        setShowCreateModal(false);
        loadBatches();
      } else {
        setFormError(res.error?.message || 'Failed to create payroll batch');
      }
    } catch {
      setFormError('Failed to create payroll batch. Please check branch and date inputs.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LOCKED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            <Lock size={12} /> LOCKED
          </span>
        );
      case 'REVIEWED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            <FileCheck size={12} /> REVIEWED
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}>
            <AlertCircle size={12} /> DRAFT
          </span>
        );
    }
  };

  return (
    <DashboardLayout
      title="Monthly Payroll Batches"
      subtitle="Create, calculate, review, and lock monthly salary batches"
      action={
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
          }}
        >
          <Plus size={16} /> Create Monthly Batch
        </button>
      }
    >
      {/* Filter Bar */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'DRAFT', 'REVIEWED', 'LOCKED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: statusFilter === st ? '1px solid var(--primary-500)' : '1px solid var(--border-subtle)',
                background: statusFilter === st ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                color: statusFilter === st ? 'var(--primary-400)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Year:</label>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={loadBatches}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading payroll batches...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <div>{error}</div>
          </div>
        ) : batches.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Layers size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Payroll Batches Found</div>
            <div style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
              Create a batch for the active branch and month to initiate salary calculations.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Batch Number</th>
                <th style={{ padding: '12px 16px' }}>Payroll Period</th>
                <th style={{ padding: '12px 16px' }}>Branch</th>
                <th style={{ padding: '12px 16px' }}>Employees</th>
                <th style={{ padding: '12px 16px' }}>Gross Wages</th>
                <th style={{ padding: '12px 16px' }}>Total Deductions</th>
                <th style={{ padding: '12px 16px' }}>Net Wages</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{b.batchNumber}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {new Date(b.year, b.month - 1).toLocaleString('default', { month: 'long' })} {b.year}
                  </td>
                  <td style={{ padding: '14px 16px' }}>{b.branch?.branchName || 'Branch'}</td>
                  <td style={{ padding: '14px 16px' }}>{b.totalEmployees}</td>
                  <td style={{ padding: '14px 16px' }}>
                    ₹{Number(b.totalGrossWages || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#ef4444' }}>
                    -₹{Number(b.totalDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10b981' }}>
                    ₹{Number(b.totalNetWages || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>{getStatusBadge(b.status)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/dashboard/payroll/batches/${b.id}`}
                      prefetch={false}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--primary-400)',
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                      }}
                    >
                      Process & View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--primary-400)" />
                Create Monthly Payroll Batch
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} style={{ padding: '24px' }}>
              {formError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: '0.8125rem',
                  marginBottom: '16px',
                }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Payroll Month *
                  </label>
                  <select
                    value={newMonth}
                    onChange={(e) => setNewMonth(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {[
                      { m: 1, name: 'January' },
                      { m: 2, name: 'February' },
                      { m: 3, name: 'March' },
                      { m: 4, name: 'April' },
                      { m: 5, name: 'May' },
                      { m: 6, name: 'June' },
                      { m: 7, name: 'July' },
                      { m: 8, name: 'August' },
                      { m: 9, name: 'September' },
                      { m: 10, name: 'October' },
                      { m: 11, name: 'November' },
                      { m: 12, name: 'December' },
                    ].map((item) => (
                      <option key={item.m} value={item.m}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Payroll Year *
                  </label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Branch Identifier (Optional if user has branch assigned)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. branch-id or leave empty for user branch"
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {creating ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
