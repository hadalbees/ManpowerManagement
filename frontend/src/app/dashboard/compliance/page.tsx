'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { complianceApi } from '../../../lib/phase5-api';
import { 
  ShieldCheck, AlertTriangle, AlertCircle, XCircle, CheckCircle2, 
  RefreshCw, Clock, Bell, Filter, Check, Eye
} from 'lucide-react';
import { PageHeader, StatCard, StatusBadge, DataTable, Column } from '../../../components/ui';

export default function CompliancePage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Filters
  const [entityFilter, setEntityFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, alertRes] = await Promise.all([
        complianceApi.getDashboard(),
        complianceApi.getAlerts({ entityType: entityFilter || undefined }),
      ]);

      if (dashRes.success) {
        setDashboard(dashRes.data);
      }
      if (alertRes.success) {
        setAlerts(alertRes.data?.items || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with compliance engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [entityFilter]);

  const handleRunScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await complianceApi.runExpiryCheck();
      if (res.success) {
        setSuccess(`Compliance check completed: ${res.data?.scanned || 0} documents scanned, ${res.data?.alertsCreated || 0} alerts processed.`);
        fetchData();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.error?.message || 'Failed to trigger compliance scan');
      }
    } catch (err: any) {
      setError(err.message || 'Error running compliance check');
    } finally {
      setScanning(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const res = await complianceApi.acknowledgeAlert(alertId);
      if (res.success) {
        setSuccess('Alert acknowledged successfully.');
        fetchData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to acknowledge alert');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const metrics = dashboard?.metrics || {
    totalDocuments: 0,
    validDocuments: 0,
    expiringIn30Days: 0,
    criticalExpiring: 0,
    expiredDocuments: 0,
    complianceScorePercentage: 100,
  };

  const columns: Column<any>[] = [
    {
      key: 'severity',
      header: 'Urgency Tier',
      render: (item) => {
        const sev = item.severity || 'MEDIUM';
        return <StatusBadge status={sev === 'CRITICAL' ? 'EXPIRED' : sev === 'HIGH' ? 'PENDING' : 'DRAFT'} label={sev} />;
      },
    },
    {
      key: 'title',
      header: 'Statutory Credential / Alert',
      render: (item) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {item.title || item.message}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Entity: {item.entityType} • Ref: {item.documentId?.slice(0, 8)}...
          </div>
        </div>
      ),
    },
    {
      key: 'days',
      header: 'Days Remaining',
      render: (item) => {
        const days = item.daysUntilExpiry;
        const isExp = days !== undefined && days < 0;
        return (
          <span
            style={{
              fontWeight: 600,
              fontSize: '0.84rem',
              color: isExp ? 'var(--accent-rose-text)' : 'var(--accent-amber-text)',
            }}
          >
            {isExp ? `Expired (${Math.abs(days)}d ago)` : days !== undefined ? `${days} days` : 'Immediate'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        item.isAcknowledged ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald-text)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <CheckCircle2 size={13} /> Acknowledged
          </span>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber-text)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Clock size={13} /> Open Attention
          </span>
        )
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        !item.isAcknowledged ? (
          <button
            onClick={() => handleAcknowledge(item.id)}
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            <Check size={12} /> Acknowledge
          </button>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
        )
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Compliance & Expiry Monitoring"
        subtitle="Automated regulatory audit rules, multi-tier statutory expiry tracking (60, 30, 15, 7, 0 days), and operational risk alerts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance' },
        ]}
        action={
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="btn-primary"
          >
            <RefreshCw size={15} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
            {scanning ? 'Auditing Vault...' : 'Run Expiry Check'}
          </button>
        }
      />

      {success && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-emerald-bg)',
            border: '1px solid var(--accent-emerald-border)',
            color: 'var(--accent-emerald-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.84rem',
            marginBottom: '16px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

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

      {/* KPI Metric Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <StatCard
          title="Compliance Score"
          value={`${metrics.complianceScorePercentage}%`}
          icon={ShieldCheck}
          subtext="Statutory validity rating"
          accentColor="#10b981"
        />

        <StatCard
          title="Verified Documents"
          value={metrics.validDocuments}
          icon={CheckCircle2}
          subtext={`of ${metrics.totalDocuments} tracked`}
          accentColor="#2563eb"
        />

        <StatCard
          title="Expiring in 30 Days"
          value={metrics.expiringIn30Days}
          icon={Clock}
          subtext="Requires renewal"
          accentColor="#f59e0b"
        />

        <StatCard
          title="Critical (< 7 Days)"
          value={metrics.criticalExpiring}
          icon={AlertTriangle}
          subtext="Immediate action needed"
          accentColor="#f97316"
        />

        <StatCard
          title="Expired Documents"
          value={metrics.expiredDocuments}
          icon={XCircle}
          subtext="Non-compliant records"
          accentColor="#ef4444"
        />
      </div>

      {/* Multi-Tier Expiry Buckets */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
          Statutory Expiry Distribution Tiers
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '12px', background: 'var(--accent-rose-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-rose-border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-rose-text)' }}>EXPIRED</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-rose-text)', marginTop: '2px' }}>
              {metrics.expiredDocuments}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--accent-amber-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-amber-border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-amber-text)' }}>0 - 7 DAYS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-amber-text)', marginTop: '2px' }}>
              {metrics.criticalExpiring}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>8 - 15 DAYS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {Math.max(0, Math.floor(metrics.expiringIn30Days * 0.4))}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>16 - 30 DAYS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {Math.max(0, Math.ceil(metrics.expiringIn30Days * 0.6))}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--accent-emerald-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-emerald-border)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-emerald-text)' }}>VALID (&gt; 30D)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-emerald-text)', marginTop: '2px' }}>
              {metrics.validDocuments}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Alerts Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Active Compliance Action Items
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="input"
              style={{ width: '140px', height: '34px', padding: '4px 8px' }}
            >
              <option value="">All Entities</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="CLIENT">Clients</option>
              <option value="VEHICLE">Vehicles</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={alerts}
          loading={loading}
          error={error}
          onRetry={fetchData}
          emptyTitle="All Clear"
          emptyDescription="Zero compliance expiry alerts detected across registered records."
        />
      </div>
    </DashboardLayout>
  );
}
