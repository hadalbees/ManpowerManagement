'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { leaveApi, LeaveRequest, LeaveBalance } from '@/lib/leave-api';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Eye,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { PageHeader, StatCard, StatusBadge, DataTable, Column } from '@/components/ui';

export default function LeaveDashboardPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, balRes] = await Promise.all([
        leaveApi.getLeaveRequests({ limit: 10 }),
        leaveApi.getLeaveBalances(),
      ]);

      if (reqRes.success && reqRes.data) {
        setRequests(reqRes.data.items || []);
      } else {
        setError(reqRes.error?.message || 'Failed to load leave requests');
      }

      if (balRes.success && balRes.data) {
        setBalances(balRes.data || []);
      }
    } catch {
      setError('An unexpected error occurred while loading leave overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Metrics
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingCount = requests.filter(
    (r) => r.status === 'APPROVED' && r.startDate >= todayStr,
  ).length;

  const totalConsumed = balances.reduce((sum, b) => sum + Number(b.consumedDays || 0), 0);
  const totalAvailable = balances.reduce((sum, b) => sum + Number(b.closingBalance || 0), 0);

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {r.employee?.firstName} {r.employee?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            {r.employee?.employeeCode}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Leave Type',
      render: (r) => (
        <span
          style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            border: '1px solid var(--border-subtle)',
          }}
        >
          {r.leaveType?.name || r.leaveType?.code || 'Leave'}
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Duration & Days',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {r.totalDays} {r.totalDays === 1 ? 'Day' : 'Days'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {new Date(r.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {new Date(r.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {r.reason || 'Personal reasons'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <Link
          href={`/dashboard/leave/requests/${r.id}`}
          className="btn-secondary"
          style={{
            padding: '5px 10px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Eye size={13} /> Review
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Leave Management"
        subtitle="Personnel leave requests, annual entitlement ledgers, supervisor approvals, and workforce availability"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Leave' },
        ]}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/dashboard/leave/balances" className="btn-secondary">
              <CalendarDays size={15} /> Balance Ledger
            </Link>
            <Link href="/dashboard/leave/new" className="btn-primary">
              <Plus size={15} /> Apply Leave
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
          title="Pending Approvals"
          value={pendingCount}
          icon={Clock}
          subtext="Requires supervisor action"
          accentColor="#f59e0b"
        />

        <StatCard
          title="Upcoming Approved"
          value={upcomingCount}
          icon={Calendar}
          subtext="Approved future leaves"
          accentColor="#2563eb"
        />

        <StatCard
          title="Days Consumed"
          value={totalConsumed}
          icon={CheckCircle2}
          subtext="Total taken this year"
          accentColor="#10b981"
        />

        <StatCard
          title="Available Balance Pool"
          value={totalAvailable}
          icon={ShieldCheck}
          subtext="Closing ledger balance"
          accentColor="#6366f1"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <Link
          href="/dashboard/leave/requests"
          className="card card-interactive"
          style={{ padding: '18px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              All Leave Requests
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Filter, search, approve or reject applications
            </div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--accent-blue)' }} />
        </Link>

        <Link
          href="/dashboard/leave/balances"
          className="card card-interactive"
          style={{ padding: '18px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Leave Balance Ledger
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              View earned, sick, and casual balance quotas
            </div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--accent-blue)' }} />
        </Link>
      </div>

      {/* Recent Leave Requests Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Leave Applications
          </h2>
          <Link
            href="/dashboard/leave/requests"
            style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
          >
            View All ({requests.length}) →
          </Link>
        </div>

        <DataTable
          columns={columns}
          data={requests}
          loading={loading}
          error={error}
          onRetry={loadData}
          emptyTitle="No Leave Requests"
          emptyDescription="No leave applications submitted yet."
        />
      </div>
    </DashboardLayout>
  );
}
