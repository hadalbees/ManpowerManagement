'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { payrollApi, PayrollBatch, SalaryCalculationItem } from '@/lib/payroll-api';
import {
  Layers,
  Calendar,
  Lock,
  FileCheck,
  Calculator,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Users,
  Search,
  FileText,
  Clock,
  ShieldCheck,
  Coins,
} from 'lucide-react';

export default function PayrollBatchDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [batch, setBatch] = useState<PayrollBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadBatch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await payrollApi.getBatchById(id);
      if (res.success && res.data) {
        setBatch(res.data);
      } else {
        setError(res.error?.message || 'Failed to load payroll batch');
      }
    } catch {
      setError('An unexpected error occurred while loading batch details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  const handleCalculate = async () => {
    if (!id || processing) return;
    setProcessing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await payrollApi.calculateBatch(id);
      if (res.success && res.data) {
        setBatch(res.data);
        setSuccessMessage('Payroll calculation completed! All muster rolls, OT hours, advances, and statutories aggregated.');
      } else {
        setError(res.error?.message || 'Failed to calculate payroll');
      }
    } catch {
      setError('Failed to calculate payroll batch');
    } finally {
      setProcessing(false);
    }
  };

  const handleLock = async () => {
    if (!id || processing) return;
    const confirm = window.confirm('Are you sure you want to LOCK this payroll batch? This will freeze attendance, apply advance recoveries, and publish employee payslips permanently.');
    if (!confirm) return;

    setProcessing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await payrollApi.lockBatch(id);
      if (res.success && res.data) {
        setBatch(res.data);
        setSuccessMessage('Payroll batch successfully LOCKED! Payslips generated and published for all employees.');
      } else {
        setError(res.error?.message || 'Failed to lock payroll batch');
      }
    } catch {
      setError('Failed to lock payroll batch');
    } finally {
      setProcessing(false);
    }
  };

  const filteredCalculations = (batch?.calculations || []).filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${c.employee?.firstName || ''} ${c.employee?.lastName || ''}`.toLowerCase();
    const code = (c.employee?.employeeCode || '').toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  return (
    <DashboardLayout
      title={batch ? `Batch ${batch.batchNumber}` : 'Payroll Batch Details'}
      subtitle={batch ? `${new Date(batch.year, batch.month - 1).toLocaleString('default', { month: 'long' })} ${batch.year} • ${batch.branch?.branchName || 'Branch'}` : ''}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/dashboard/payroll/batches"
            prefetch={false}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} /> Back to Batches
          </Link>

          {batch && batch.status !== 'LOCKED' && (
            <button
              onClick={handleCalculate}
              disabled={processing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid var(--primary-500)',
                color: 'var(--primary-400)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: processing ? 'not-allowed' : 'pointer',
              }}
            >
              <Calculator size={16} />
              {processing ? 'Processing...' : 'Calculate Payroll'}
            </button>
          )}

          {batch && batch.status === 'REVIEWED' && (
            <button
              onClick={handleLock}
              disabled={processing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: processing ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Lock size={16} /> Lock & Publish Payslips
            </button>
          )}
        </div>
      }
    >
      {/* Alert Messages */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#ef4444',
          fontSize: '0.875rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          color: '#10b981',
          fontSize: '0.875rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading batch calculation data...
        </div>
      ) : !batch ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Batch not found.
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>
                {batch.status}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {batch.lockedAt ? `Locked on ${new Date(batch.lockedAt).toLocaleDateString()}` : 'Editable / Recalculable'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>HEADCOUNT</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>
                {batch.totalEmployees} Employees
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Branch muster roll eligible
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL GROSS WAGES</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
                ₹{Number(batch.totalGrossWages || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Basic + Allowances + OT
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL DEDUCTIONS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', color: '#ef4444' }}>
                -₹{Number(batch.totalDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Statutory + Advances
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>NET PAYABLE WAGES</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
                ₹{Number(batch.totalNetWages || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Net Take-Home Pay
              </div>
            </div>
          </div>

          {/* Calculations Detail Section */}
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--primary-400)" />
                Employee Salary Calculations & Statutory Breakdowns ({filteredCalculations.length})
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '280px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  width: '100%',
                }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {filteredCalculations.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {batch.status === 'DRAFT'
                    ? 'No calculations generated yet. Click "Calculate Payroll" to process.'
                    : 'No matching employee calculations found.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '10px 14px' }}>Employee</th>
                      <th style={{ padding: '10px 14px' }}>Attendance</th>
                      <th style={{ padding: '10px 14px' }}>Overtime</th>
                      <th style={{ padding: '10px 14px' }}>Gross Earned</th>
                      <th style={{ padding: '10px 14px' }}>EPF</th>
                      <th style={{ padding: '10px 14px' }}>ESIC</th>
                      <th style={{ padding: '10px 14px' }}>PT & LWF</th>
                      <th style={{ padding: '10px 14px' }}>Advance</th>
                      <th style={{ padding: '10px 14px' }}>Total Ded.</th>
                      <th style={{ padding: '10px 14px' }}>Net Pay</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Payslip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalculations.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {c.employee?.firstName} {c.employee?.lastName}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {c.employee?.employeeCode} • {c.employee?.primaryDesignation?.name || c.employee?.primaryDesignation?.title || 'Staff'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 600 }}>{c.payableDays}</span> / {c.totalCalendarDays} days
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {c.paidLeaveDays} Leave • {c.weeklyOffDays} Off
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {c.overtimeHours > 0 ? (
                            <div>
                              <span style={{ fontWeight: 600 }}>{c.overtimeHours} hrs</span>
                              <div style={{ fontSize: '0.6875rem', color: '#10b981' }}>
                                +₹{Number(c.overtimeAmount || 0)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          ₹{Number(c.grossEarned || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#ef4444' }}>
                          ₹{Number(c.epfEmployee || 0)}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#ef4444' }}>
                          ₹{Number(c.esiEmployee || 0)}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#ef4444' }}>
                          ₹{Number(c.professionalTax || 0) + Number(c.labourWelfareFund || 0)}
                        </td>
                        <td style={{ padding: '12px 14px', color: c.advanceDeduction > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                          {c.advanceDeduction > 0 ? `₹${Number(c.advanceDeduction)}` : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#ef4444' }}>
                          -₹{Number(c.totalDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#10b981' }}>
                          ₹{Number(c.netSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {c.payslip ? (
                            <Link
                              href={`/dashboard/payslips/${c.payslip.id}`}
                              prefetch={false}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '6px',
                                color: 'var(--primary-400)',
                                textDecoration: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              <FileText size={12} /> Payslip
                            </Link>
                          ) : (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Unpublished</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
