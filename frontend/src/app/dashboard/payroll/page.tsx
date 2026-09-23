'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { payrollApi, PayrollBatch, SalaryAdvance } from '@/lib/payroll-api';
import {
  Wallet,
  Calendar,
  Lock,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Coins,
  ShieldCheck,
  Eye,
  FileCheck
} from 'lucide-react';
import { PageHeader, StatCard, StatusBadge, DataTable, Column } from '@/components/ui';

export default function PayrollDashboardPage() {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [batchesRes, advancesRes] = await Promise.all([
        payrollApi.getBatches({ limit: 10 }),
        payrollApi.getAdvances({ limit: 10 }),
      ]);
      if (batchesRes.success && batchesRes.data) {
        setBatches(batchesRes.data.items || []);
      }
      if (advancesRes.success && advancesRes.data) {
        setAdvances(advancesRes.data.items || []);
      }
    } catch {
      setError('An unexpected error occurred while loading payroll overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate Metrics
  const lockedBatches = batches.filter((b) => b.status === 'LOCKED').length;
  const draftBatches = batches.filter((b) => b.status === 'DRAFT' || b.status === 'REVIEWED').length;
  const totalGrossDisbursed = batches
    .filter((b) => b.status === 'LOCKED')
    .reduce((sum, b) => sum + Number(b.totalGrossWages || 0), 0);
  const totalNetDisbursed = batches
    .filter((b) => b.status === 'LOCKED')
    .reduce((sum, b) => sum + Number(b.totalNetWages || 0), 0);
  const activeAdvancesTotal = advances
    .filter((a) => a.status === 'ACTIVE')
    .reduce((sum, a) => sum + Number(a.balanceAmount || 0), 0);

  const formatCurrency = (amt: number = 0) => {
    return '₹' + amt.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const columns: Column<PayrollBatch>[] = [
    {
      key: 'batchNumber',
      header: 'Batch Number',
      render: (b) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'var(--accent-blue-text)',
            background: 'var(--accent-blue-bg)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          {b.batchNumber}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Payroll Period',
      render: (b) => {
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {monthNames[b.month]} {b.year}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {b.totalEmployees || 0} Employees Computed
            </div>
          </div>
        );
      },
    },
    {
      key: 'gross',
      header: 'Total Gross Wages',
      render: (b) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatCurrency(Number(b.totalGrossWages || 0))}
        </span>
      ),
    },
    {
      key: 'deductions',
      header: 'Statutory Deductions',
      render: (b) => {
        const deductions = Number(b.totalGrossWages || 0) - Number(b.totalNetWages || 0);
        return (
          <span style={{ color: 'var(--text-secondary)' }}>
            {formatCurrency(Math.max(0, deductions))}
          </span>
        );
      },
    },
    {
      key: 'net',
      header: 'Net Payable',
      render: (b) => (
        <span style={{ fontWeight: 700, color: 'var(--accent-emerald-text)' }}>
          {formatCurrency(Number(b.totalNetWages || 0))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Lifecycle State',
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (b) => (
        <Link
          href={`/dashboard/payroll/batches/${b.id}`}
          className="btn-secondary"
          style={{
            padding: '5px 10px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Eye size={13} /> Open
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Payroll & Financial Engine"
        subtitle="Gross-to-net wage engine, Indian statutory deductions (PF, ESIC, PT, LWF), salary advances, and locked historical records"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll' },
        ]}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/dashboard/payslips" className="btn-secondary">
              <FileCheck size={15} /> All Payslips
            </Link>
            <Link href="/dashboard/payroll/batches" className="btn-primary">
              <Plus size={15} /> Payroll Batches
            </Link>
          </div>
        }
      />

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-rose-bg)',
            border: '1px solid var(--accent-rose-border)',
            color: 'var(--accent-rose-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.84rem',
            marginBottom: '16px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard
          title="Disbursed Gross"
          value={formatCurrency(totalGrossDisbursed)}
          icon={Wallet}
          subtext="Locked wage batches"
          accentColor="#2563eb"
        />

        <StatCard
          title="Net Paid Out"
          value={formatCurrency(totalNetDisbursed)}
          icon={ShieldCheck}
          subtext="Net bank transfers"
          accentColor="#10b981"
        />

        <StatCard
          title="Batches in Progress"
          value={draftBatches}
          icon={Calendar}
          subtext="Draft or in review"
          accentColor="#f59e0b"
        />

        <StatCard
          title="Salary Advances"
          value={formatCurrency(activeAdvancesTotal)}
          icon={Coins}
          subtext="Unrecovered balance"
          accentColor="#8b5cf6"
        />
      </div>

      {/* Lifecycle Flow Indicator */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
          Batch Processing Lifecycle (Immutable upon locking)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>1. DRAFT</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Calculate hours & rates</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--accent-amber-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-amber-border)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-amber-text)' }}>2. REVIEWED</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber-text)', marginTop: '2px' }}>Auditor validation</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--accent-blue-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-blue-border)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-blue-text)' }}>3. APPROVED</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue-text)', marginTop: '2px' }}>Management sign-off</div>
          </div>
          <div style={{ padding: '10px', background: '#0f172a', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: '#ffffff' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc' }}>4. LOCKED 🔒</span>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Snapshot sealed</div>
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Payroll Batches
          </h2>
          <Link
            href="/dashboard/payroll/batches"
            style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
          >
            All Batches →
          </Link>
        </div>

        <DataTable
          columns={columns}
          data={batches}
          loading={loading}
          error={error}
          onRetry={loadData}
          emptyTitle="No Payroll Batches"
          emptyDescription="Zero payroll batches created yet. Initiate a new monthly period run."
          emptyAction={
            <Link href="/dashboard/payroll/batches" className="btn-primary">
              <Plus size={15} /> Create Period Batch
            </Link>
          }
        />
      </div>
    </DashboardLayout>
  );
}
