'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { payrollApi, Payslip } from '@/lib/payroll-api';
import {
  FileText,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
  Download,
  Building2,
} from 'lucide-react';

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollApi.getPayslips({
        month: monthFilter,
        year: yearFilter,
        limit: 50,
      });
      if (res.success && res.data) {
        setPayslips(res.data.items || []);
      } else {
        setError(res.error?.message || 'Failed to load employee payslips');
      }
    } catch {
      setError('An unexpected error occurred while loading payslips');
    } finally {
      setLoading(false);
    }
  }, [monthFilter, yearFilter]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  const filtered = payslips.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.toLowerCase();
    const code = (p.employee?.employeeCode || '').toLowerCase();
    const num = (p.payslipNumber || '').toLowerCase();
    return name.includes(q) || code.includes(q) || num.includes(q);
  });

  return (
    <DashboardLayout
      title="Employee Payslips Directory"
      subtitle="Published statutory salary slips with earnings, deductions, and bank disbursement records"
    >
      {/* Filter and Search Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '300px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '8px 14px',
            width: '100%',
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by employee, code, or payslip number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Period:</label>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          >
            {[
              { m: 1, name: 'Jan' },
              { m: 2, name: 'Feb' },
              { m: 3, name: 'Mar' },
              { m: 4, name: 'Apr' },
              { m: 5, name: 'May' },
              { m: 6, name: 'Jun' },
              { m: 7, name: 'Jul' },
              { m: 8, name: 'Aug' },
              { m: 9, name: 'Sep' },
              { m: 10, name: 'Oct' },
              { m: 11, name: 'Nov' },
              { m: 12, name: 'Dec' },
            ].map((item) => (
              <option key={item.m} value={item.m}>{item.name}</option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            style={{
              padding: '8px 12px',
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
        </div>
      </div>

      {/* Payslips Table */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading payslips...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <div>{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Payslips Found</div>
            <div style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
              Payslips are automatically generated and published when a monthly payroll batch is locked.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Payslip Number</th>
                <th style={{ padding: '12px 16px' }}>Employee</th>
                <th style={{ padding: '12px 16px' }}>Period</th>
                <th style={{ padding: '12px 16px' }}>Gross Earnings</th>
                <th style={{ padding: '12px 16px' }}>Total Deductions</th>
                <th style={{ padding: '12px 16px' }}>Net Pay</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{p.payslipNumber}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {p.employee?.firstName} {p.employee?.lastName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.employee?.employeeCode} • {p.employee?.primaryDesignation?.name || 'Staff'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {new Date(p.year, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    ₹{Number(p.grossEarnings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#ef4444' }}>
                    -₹{Number(p.totalDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: '#10b981' }}>
                    ₹{Number(p.netPay || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {p.isPublished ? (
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
                        <CheckCircle2 size={12} /> PUBLISHED
                      </span>
                    ) : (
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
                      }}>
                        DRAFT
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/dashboard/payslips/${p.id}`}
                      prefetch={false}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
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
                      <Eye size={14} /> View Slip
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
