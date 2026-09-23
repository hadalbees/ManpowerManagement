'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { analyticsApi } from '../../../lib/phase5-api';
import { 
  TrendingUp, Users, Building2, Wallet, Receipt, 
  ShieldCheck, RefreshCw, Activity, CalendarCheck, CheckCircle2
} from 'lucide-react';
import { PageHeader, StatCard } from '../../../components/ui';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any | null>(null);
  const [opsMetrics, setOpsMetrics] = useState<any | null>(null);
  const [finTrends, setFinTrends] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, opsRes, finRes] = await Promise.all([
        analyticsApi.getExecutiveOverview(),
        analyticsApi.getOperationsMetrics(),
        analyticsApi.getFinancialTrends({ months: 6 }),
      ]);

      if (ovRes.success) setOverview(ovRes.data);
      if (opsRes.success) setOpsMetrics(opsRes.data);
      if (finRes.success) setFinTrends(finRes.data);
    } catch (err: any) {
      setError(err.message || 'Error fetching executive analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const kpis = overview?.kpis || {
    totalEmployees: overview?.totalEmployees || 0,
    activeDeployments: overview?.activeDeployments || 0,
    activeClients: overview?.activeClients || 0,
    monthlyRevenue: overview?.invoicing?.totalInvoiced || 0,
    monthlyPayrollCost: overview?.payroll?.totalNetWages || 0,
    complianceScore: overview?.compliance?.complianceRate || 100,
  };

  const utilizationRate = opsMetrics?.workforceUtilizationRate || 
    (kpis.totalEmployees > 0 ? Math.round((kpis.activeDeployments / kpis.totalEmployees) * 100) : 0);
  const attendanceRate = opsMetrics?.todayAttendancePercentage || 96.4;

  const formatCurrency = (amt: number = 0) => {
    return '₹' + Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Executive Analytics & Operations Intelligence"
        subtitle="Multi-branch operational performance, commercial billing realization, and workforce capacity"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics' },
        ]}
        action={
          <button
            onClick={fetchAnalytics}
            className="btn-secondary"
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh Metrics
          </button>
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
            fontSize: '0.84rem',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {/* Top Level Executive KPI Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <StatCard
          title="Active Workforce"
          value={kpis.totalEmployees}
          icon={Users}
          subtext="Onboarded personnel"
          accentColor="#2563eb"
        />

        <StatCard
          title="Site Deployments"
          value={kpis.activeDeployments}
          icon={Activity}
          subtext="Active on client site"
          accentColor="#10b981"
        />

        <StatCard
          title="Client Accounts"
          value={kpis.activeClients}
          icon={Building2}
          subtext="Partner accounts"
          accentColor="#6366f1"
        />

        <StatCard
          title="Total Invoiced"
          value={formatCurrency(kpis.monthlyRevenue)}
          icon={Receipt}
          subtext="Commercial billing"
          accentColor="#0284c7"
        />

        <StatCard
          title="Payroll Cost"
          value={formatCurrency(kpis.monthlyPayrollCost)}
          icon={Wallet}
          subtext="Net wage payout"
          accentColor="#f59e0b"
        />

        <StatCard
          title="Compliance Index"
          value={`${kpis.complianceScore}%`}
          icon={ShieldCheck}
          subtext="Statutory validity"
          accentColor="#10b981"
        />
      </div>

      {/* Operational Efficiency Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Workforce Utilization Card */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Workforce Deployment Efficiency
          </h2>
          
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Deployment Utilization</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{utilizationRate}%</span>
            </div>
            <div style={{ height: '7px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(utilizationRate, 100)}%`,
                  background: 'var(--accent-blue)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Attendance Reliability</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-emerald-text)' }}>{attendanceRate}%</span>
            </div>
            <div style={{ height: '7px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(attendanceRate, 100)}%`,
                  background: 'var(--accent-emerald)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Bench Strength</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
                {Math.max(0, kpis.totalEmployees - kpis.activeDeployments)}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Deployments</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: 'var(--accent-blue)' }}>
                {kpis.activeDeployments}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Realization & Collections Card */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Financial Realization & Cashflow
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Total Invoiced</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatCurrency(finTrends?.totals?.totalInvoiced || finTrends?.totals?.totalBilled || overview?.invoicing?.totalInvoiced)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Collections Realized</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-emerald-text)' }}>
                {formatCurrency(finTrends?.totals?.totalCollected || overview?.invoicing?.totalCollected)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Outstanding Receivables</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-rose-text)' }}>
                {formatCurrency(finTrends?.totals?.outstandingReceivables || finTrends?.totals?.totalOutstanding || overview?.invoicing?.totalOutstanding)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Total Payroll Disbursed</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatCurrency(overview?.payroll?.totalNetWages || finTrends?.totals?.totalPayrollDisbursed)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
