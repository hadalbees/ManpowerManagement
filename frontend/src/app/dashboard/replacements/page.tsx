'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { replacementsApi, ReplacementRecord } from '@/lib/replacements-api';
import {
  RefreshCw,
  UserCheck,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
  Eye,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { PageHeader, StatCard, StatusBadge, DataTable, Column } from '@/components/ui';

export default function ReplacementsDashboardPage() {
  const [replacements, setReplacements] = useState<ReplacementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await replacementsApi.getAll({ limit: 20 });
      if (res.success && res.data) {
        setReplacements(res.data.items || []);
      } else {
        setError(res.error?.message || 'Failed to load replacements');
      }
    } catch {
      setError('An unexpected error occurred while loading replacements overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Metrics
  const dispatchedCount = replacements.filter((r) => r.status === 'DISPATCHED').length;
  const completedCount = replacements.filter((r) => r.status === 'COMPLETED').length;
  const totalReplacements = replacements.length;
  const fillRate = totalReplacements > 0 ? Math.round(((dispatchedCount + completedCount) / totalReplacements) * 100) : 100;

  const columns: Column<ReplacementRecord>[] = [
    {
      key: 'code',
      header: 'Tracking Code',
      render: (r) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--accent-blue-text)',
            background: 'var(--accent-blue-bg)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          {(r as any).replacementCode || `REP-${r.id.slice(0, 8).toUpperCase()}`}
        </span>
      ),
    },
    {
      key: 'absent',
      header: 'Absent Personnel',
      render: (r) => {
        const emp = r.absentEmployee || (r.originalDeployment as any)?.employee;
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {emp?.firstName} {emp?.lastName}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {emp?.employeeCode} • {r.reason?.replace(/_/g, ' ') || 'Unscheduled Absence'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'replacement',
      header: 'Standby Replacement',
      render: (r) => {
        const rep = r.replacementEmployee;
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--accent-emerald-text)' }}>
              {rep?.firstName} {rep?.lastName}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {rep?.employeeCode}
            </div>
          </div>
        );
      },
    },
    {
      key: 'client',
      header: 'Client & Site',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
            {r.originalDeployment?.client?.companyName || 'Corporate Client'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {r.originalDeployment?.clientSite?.siteName}
          </div>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Shift Coverage Window',
      render: (r) => (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {new Date(r.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          {r.endDate ? ` → ${new Date(r.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ' (Ongoing)'}
        </div>
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
          href={`/dashboard/replacements/requests/${r.id}`}
          className="btn-secondary"
          style={{
            padding: '5px 10px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Eye size={13} /> View
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Replacements & Standby Operations"
        subtitle="Unscheduled workforce substitutions, standby dispatch allocations, SLA fulfillment tracking, and audit logs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Replacements' },
        ]}
        action={
          <Link href="/dashboard/replacements/new" className="btn-primary">
            <Plus size={15} /> Dispatch Replacement
          </Link>
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
          title="Active Replacements"
          value={dispatchedCount}
          icon={Clock}
          subtext="Currently on client site"
          accentColor="#2563eb"
        />

        <StatCard
          title="Completed Standbys"
          value={completedCount}
          icon={CheckCircle2}
          subtext="Successfully reconciled"
          accentColor="#10b981"
        />

        <StatCard
          title="SLA Fulfillment Rate"
          value={`${fillRate}%`}
          icon={ShieldCheck}
          subtext="Replacements resolved"
          accentColor="#6366f1"
        />

        <StatCard
          title="Total Incidents"
          value={totalReplacements}
          icon={RefreshCw}
          subtext="Total logged substitutions"
          accentColor="#f59e0b"
        />
      </div>

      {/* Quick Navigation Card */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          href="/dashboard/replacements/requests"
          className="card card-interactive"
          style={{ padding: '16px 20px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RefreshCw size={18} style={{ color: 'var(--accent-blue)' }} />
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                View All Replacements Records
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Inspect complete history, filter by client, driver standby logs, and completion status
              </div>
            </div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--accent-blue)' }} />
        </Link>
      </div>

      {/* Recent Replacements Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Active & Recent Replacements
          </h2>
          <Link
            href="/dashboard/replacements/requests"
            style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
          >
            Full Roster ({replacements.length}) →
          </Link>
        </div>

        <DataTable
          columns={columns}
          data={replacements}
          loading={loading}
          error={error}
          onRetry={loadData}
          emptyTitle="No Replacements"
          emptyDescription="Zero standby replacement incidents active right now."
        />
      </div>
    </DashboardLayout>
  );
}
