'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Building2, UserCheck, Truck, CalendarDays, 
  Wallet, Receipt, ShieldCheck, AlertTriangle, Plus, 
  ArrowUpRight, Clock, CheckCircle2, XCircle, ArrowRight,
  RefreshCw, FileText, UploadCloud, CalendarCheck, ShieldAlert
} from 'lucide-react';
import { StatCard, StatusBadge } from '../../components/ui';
import { analyticsApi, complianceApi } from '../../lib/phase5-api';
import { vehiclesApi } from '../../lib/vehicles-api';
import { leaveApi } from '../../lib/leave-api';
import { payrollApi } from '../../lib/payroll-api';
import { billingApi } from '../../lib/billing-api';
import { getDeployments } from '../../lib/deployments-api';

export default function OperationalDashboardPage() {
  const { user, hasPermission } = useAuth();

  const [loading, setLoading] = useState(true);
  const [executiveData, setExecutiveData] = useState<any>(null);
  const [operationsData, setOperationsData] = useState<any>(null);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number>(0);
  const [payrollStatusCounts, setPayrollStatusCounts] = useState({ draft: 0, reviewed: 0, approved: 0, locked: 0 });
  const [billingStatusCounts, setBillingStatusCounts] = useState({ draft: 0, outstanding: 0, overdue: 0, paid: 0 });
  const [deploymentsSummary, setDeploymentsSummary] = useState({ active: 0, upcoming: 0, endingSoon: 0, replacementReq: 0 });

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // Parallel data loading for executive KPIs & operational metrics
        const [
          execRes,
          opsRes,
          compRes,
          vehRes,
          leaveRes,
          payrollRes,
          billingRes,
          deployRes
        ] = await Promise.allSettled([
          analyticsApi.getExecutiveOverview(),
          analyticsApi.getOperationsMetrics(),
          complianceApi.getDashboard(),
          vehiclesApi.getVehicles({ limit: 1 }),
          leaveApi.getLeaveRequests({ status: 'PENDING', limit: 1 }),
          payrollApi.getBatches({ limit: 50 }),
          billingApi.getInvoices({ limit: 50 }),
          getDeployments({ limit: 50 }),
        ]);

        if (execRes.status === 'fulfilled' && execRes.value.success && execRes.value.data) {
          setExecutiveData(execRes.value.data);
        }

        if (opsRes.status === 'fulfilled' && opsRes.value.success && opsRes.value.data) {
          setOperationsData(opsRes.value.data);
        }

        if (compRes.status === 'fulfilled' && compRes.value.success && compRes.value.data) {
          setComplianceData(compRes.value.data);
        }

        if (vehRes.status === 'fulfilled' && vehRes.value.success && vehRes.value.data) {
          const vData = vehRes.value.data as any;
          setVehicleCount(vData.total ?? vData.pagination?.total ?? (vData.items?.length ?? 0));
        }

        if (leaveRes.status === 'fulfilled' && leaveRes.value.success && leaveRes.value.data) {
          const lData = leaveRes.value.data as any;
          setPendingLeaveCount(lData.total ?? lData.pagination?.total ?? (lData.items?.length ?? 0));
        }

        if (payrollRes.status === 'fulfilled' && payrollRes.value.success && payrollRes.value.data) {
          const batches = payrollRes.value.data.items || [];
          const counts = { draft: 0, reviewed: 0, approved: 0, locked: 0 };
          batches.forEach((b: any) => {
            const s = String(b.status || '').toUpperCase();
            if (s === 'DRAFT') counts.draft++;
            else if (s === 'REVIEWED') counts.reviewed++;
            else if (s === 'APPROVED') counts.approved++;
            else if (s === 'LOCKED') counts.locked++;
          });
          setPayrollStatusCounts(counts);
        }

        if (billingRes.status === 'fulfilled' && billingRes.value.success && billingRes.value.data) {
          const invoices = billingRes.value.data.items || [];
          const counts = { draft: 0, outstanding: 0, overdue: 0, paid: 0 };
          invoices.forEach((inv: any) => {
            const s = String(inv.status || '').toUpperCase();
            if (s === 'DRAFT') counts.draft++;
            else if (s === 'ISSUED' || s === 'PARTIAL') counts.outstanding++;
            else if (s === 'OVERDUE') counts.overdue++;
            else if (s === 'PAID') counts.paid++;
          });
          setBillingStatusCounts(counts);
        }

        if (deployRes.status === 'fulfilled' && deployRes.value.success && deployRes.value.data) {
          const deps = deployRes.value.data.items || [];
          const summary = { active: 0, upcoming: 0, endingSoon: 0, replacementReq: 0 };
          const now = new Date();
          const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

          deps.forEach((d: any) => {
            const s = String(d.status || '').toUpperCase();
            if (s === 'ACTIVE') summary.active++;
            if (s === 'SCHEDULED' || s === 'UPCOMING') summary.upcoming++;
            if (d.endDate) {
              const end = new Date(d.endDate);
              if (end > now && end <= in7Days) summary.endingSoon++;
            }
            if (d.replacementRequired) summary.replacementReq++;
          });
          setDeploymentsSummary(summary);
        }
      } catch (err) {
        console.error('Error fetching dashboard operational metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Format currency in Indian Rupees
  const formatCurrency = (amount: number = 0) => {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const totalEmployees = executiveData?.totalEmployees ?? '—';
  const activeEmployees = executiveData?.activeEmployees ?? '—';
  const activeClients = executiveData?.activeClients ?? '—';
  const activeDeployments = executiveData?.activeDeployments ?? deploymentsSummary.active ?? '—';
  const totalOutstanding = executiveData?.invoicing?.totalOutstanding !== undefined
    ? formatCurrency(executiveData.invoicing.totalOutstanding)
    : '—';
  const payrollPending = payrollStatusCounts.draft + payrollStatusCounts.reviewed;

  // Attendance metrics
  const attendanceBreakdown = operationsData?.attendanceBreakdown || {
    present: 0,
    absent: 0,
    leave: 0,
    replacement: 0,
    overtimeHours: 0,
  };

  return (
    <DashboardLayout>
      {/* Dashboard Top Greeting & Meta */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Good morning, {user?.fullName || 'Administrator'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Operations Overview · {user?.agency?.name} · {user?.branch ? `${user.branch.name} (${user.branch.code})` : 'All Branches (HQ)'}
            </p>
          </div>

          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', background: '#ffffff', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            System Time: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* 1. KEY PERFORMANCE INDICATORS (8 CARDS) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          title="Total Workforce"
          value={totalEmployees}
          icon={Users}
          subtext="Total onboarded roster"
          accentColor="#2563eb"
        />

        <StatCard
          title="Active Employees"
          value={activeEmployees}
          icon={CheckCircle2}
          subtext="Ready & actively deployed"
          accentColor="#10b981"
        />

        <StatCard
          title="Corporate Clients"
          value={activeClients}
          icon={Building2}
          subtext="Active service contracts"
          accentColor="#6366f1"
        />

        <StatCard
          title="Active Deployments"
          value={activeDeployments}
          icon={UserCheck}
          subtext="Assigned at client sites"
          accentColor="#0284c7"
        />

        <StatCard
          title="Fleet Vehicles"
          value={vehicleCount}
          icon={Truck}
          subtext="Registered operations fleet"
          accentColor="#f59e0b"
        />

        <StatCard
          title="Pending Leave"
          value={pendingLeaveCount}
          icon={CalendarDays}
          subtext="Awaiting supervisor review"
          accentColor="#f97316"
        />

        <StatCard
          title="Payroll Pending"
          value={payrollPending}
          icon={Wallet}
          subtext="Batches in Draft / Review"
          accentColor="#8b5cf6"
        />

        <StatCard
          title="Outstanding Billing"
          value={totalOutstanding}
          icon={Receipt}
          subtext="Pending receivables"
          accentColor="#ef4444"
        />
      </div>

      {/* 2. OPERATIONS OVERVIEW (TWO-COLUMN GRID) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Attendance Overview Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarCheck size={18} style={{ color: 'var(--accent-blue)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Attendance Overview
              </h2>
            </div>
            <Link
              href="/dashboard/attendance"
              style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
            >
              View Roster →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
            <div style={{ background: 'var(--accent-emerald-bg)', border: '1px solid var(--accent-emerald-border)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-emerald-text)', textTransform: 'uppercase' }}>Present</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-emerald-text)', marginTop: '2px' }}>
                {attendanceBreakdown.present}
              </div>
            </div>

            <div style={{ background: 'var(--accent-rose-bg)', border: '1px solid var(--accent-rose-border)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-rose-text)', textTransform: 'uppercase' }}>Absent</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-rose-text)', marginTop: '2px' }}>
                {attendanceBreakdown.absent}
              </div>
            </div>

            <div style={{ background: 'var(--accent-amber-bg)', border: '1px solid var(--accent-amber-border)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-amber-text)', textTransform: 'uppercase' }}>On Leave</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-amber-text)', marginTop: '2px' }}>
                {attendanceBreakdown.leave}
              </div>
            </div>

            <div style={{ background: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-blue-text)', textTransform: 'uppercase' }}>Standby/Repl</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-blue-text)', marginTop: '2px' }}>
                {attendanceBreakdown.replacement || executiveData?.operations?.replacementsHandled || 0}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Overtime Hrs</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {attendanceBreakdown.overtimeHours || 0}h
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Overview Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} style={{ color: 'var(--accent-blue)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Deployment Overview
              </h2>
            </div>
            <Link
              href="/dashboard/deployments"
              style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
            >
              Manage Deployments →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Deployed</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {deploymentsSummary.active || activeDeployments}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Operational on site</div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Upcoming</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {deploymentsSummary.upcoming}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Scheduled starts</div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Ending Soon</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: deploymentsSummary.endingSoon > 0 ? 'var(--accent-amber-text)' : 'var(--text-primary)', marginTop: '2px' }}>
                {deploymentsSummary.endingSoon}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Next 7 days</div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Repl. Required</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: deploymentsSummary.replacementReq > 0 ? 'var(--accent-rose-text)' : 'var(--text-primary)', marginTop: '2px' }}>
                {deploymentsSummary.replacementReq}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Open substitution</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FINANCIAL OVERVIEW: PAYROLL & BILLING */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Payroll Lifecycle Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={18} style={{ color: 'var(--accent-blue)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Payroll Lifecycle
              </h2>
            </div>
            <Link
              href="/dashboard/payroll"
              style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
            >
              Payroll Center →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div style={{ padding: '10px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>DRAFT</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {payrollStatusCounts.draft}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Calculating</div>
            </div>

            <div style={{ padding: '10px 8px', background: 'var(--accent-amber-bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--accent-amber-border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber-text)', fontWeight: 600 }}>REVIEWED</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-amber-text)', marginTop: '2px' }}>
                {payrollStatusCounts.reviewed}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent-amber-text)' }}>Auditing</div>
            </div>

            <div style={{ padding: '10px 8px', background: 'var(--accent-emerald-bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--accent-emerald-border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald-text)', fontWeight: 600 }}>APPROVED</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald-text)', marginTop: '2px' }}>
                {payrollStatusCounts.approved}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent-emerald-text)' }}>Approved</div>
            </div>

            <div style={{ padding: '10px 8px', background: '#0f172a', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: '#ffffff' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>LOCKED</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {payrollStatusCounts.locked}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Immutable</div>
            </div>
          </div>
        </div>

        {/* Client Billing Overview Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} style={{ color: 'var(--accent-blue)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Client Billing & Invoicing
              </h2>
            </div>
            <Link
              href="/dashboard/billing/invoices"
              style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
            >
              Invoices List →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div style={{ padding: '10px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>DRAFT</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {billingStatusCounts.draft}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Unbilled</div>
            </div>

            <div style={{ padding: '10px 8px', background: 'var(--accent-amber-bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--accent-amber-border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber-text)', fontWeight: 600 }}>OUTSTANDING</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-amber-text)', marginTop: '2px' }}>
                {billingStatusCounts.outstanding}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent-amber-text)' }}>Due</div>
            </div>

            <div style={{ padding: '10px 8px', background: 'var(--accent-rose-bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--accent-rose-border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-rose-text)', fontWeight: 600 }}>OVERDUE</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-rose-text)', marginTop: '2px' }}>
                {billingStatusCounts.overdue}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent-rose-text)' }}>Attention</div>
            </div>

            <div style={{ padding: '10px 8px', background: 'var(--accent-emerald-bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center', border: '1px solid var(--accent-emerald-border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald-text)', fontWeight: 600 }}>PAID</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald-text)', marginTop: '2px' }}>
                {billingStatusCounts.paid}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent-emerald-text)' }}>Settled</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. COMPLIANCE & STATUTORY URGENCIES */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Regulatory Compliance & Document Expiries
            </h2>
          </div>
          <Link
            href="/dashboard/compliance"
            style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
          >
            Compliance Center →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expiring Soon (&lt; 30d)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-amber-text)', marginTop: '2px' }}>
                {executiveData?.compliance?.expiringSoonDocuments ?? 0}
              </div>
            </div>
            <Clock size={24} style={{ color: 'var(--accent-amber)' }} />
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expired Documents</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-rose-text)', marginTop: '2px' }}>
                {executiveData?.compliance?.expiredDocuments ?? 0}
              </div>
            </div>
            <XCircle size={24} style={{ color: 'var(--accent-rose)' }} />
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Statutory Compliance Rate</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-emerald-text)', marginTop: '2px' }}>
                {executiveData?.compliance?.complianceRate ? `${executiveData.compliance.complianceRate}%` : '100%'}
              </div>
            </div>
            <ShieldCheck size={24} style={{ color: 'var(--accent-emerald)' }} />
          </div>
        </div>
      </div>

      {/* 5. QUICK ACTIONS PANEL (RBAC PERMISSION CHECKED) */}
      <div className="card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
          Operations Quick Actions
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {hasPermission('EMPLOYEE_CREATE') && (
            <Link
              href="/dashboard/employees/new"
              className="btn-secondary"
              style={{ fontSize: '0.8125rem' }}
            >
              <Plus size={15} />
              Add Employee
            </Link>
          )}

          {hasPermission('CLIENT_CREATE') && (
            <Link
              href="/dashboard/clients/new"
              className="btn-secondary"
              style={{ fontSize: '0.8125rem' }}
            >
              <Building2 size={15} />
              Add Client
            </Link>
          )}

          {hasPermission('DEPLOYMENT_CREATE') && (
            <Link
              href="/dashboard/deployments/new"
              className="btn-secondary"
              style={{ fontSize: '0.8125rem' }}
            >
              <UserCheck size={15} />
              Create Deployment
            </Link>
          )}

          {hasPermission('ATTENDANCE_RECORD') && (
            <Link
              href="/dashboard/attendance"
              className="btn-secondary"
              style={{ fontSize: '0.8125rem' }}
            >
              <CalendarCheck size={15} />
              Mark Attendance
            </Link>
          )}

          {hasPermission('PAYROLL_CREATE') && (
            <Link
              href="/dashboard/payroll"
              className="btn-secondary"
              style={{ fontSize: '0.8125rem' }}
            >
              <Wallet size={15} />
              Process Payroll
            </Link>
          )}

          {hasPermission('BILLING_CREATE') && (
            <Link
              href="/dashboard/billing/invoices"
              className="btn-secondary"
              style={{ fontSize: '0.8125rem' }}
            >
              <Receipt size={15} />
              Create Invoice
            </Link>
          )}

          {hasPermission('DOCUMENT_CREATE') && (
            <Link
              href="/dashboard/documents"
              className="btn-secondary"
              style={{ fontSize: '0.8125rem' }}
            >
              <UploadCloud size={15} />
              Upload Document
            </Link>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
