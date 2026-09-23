'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { billingApi, ClientInvoice, ClientPayment } from '@/lib/billing-api';
import {
  Receipt,
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Coins,
  CreditCard,
  Eye,
} from 'lucide-react';
import { PageHeader, StatCard, StatusBadge, DataTable, Column } from '@/components/ui';

export default function BillingDashboardPage() {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, payRes] = await Promise.all([
        billingApi.getInvoices({ limit: 10 }),
        billingApi.getPayments({ limit: 10 }),
      ]);
      if (invRes.success && invRes.data) {
        setInvoices(invRes.data.items || []);
      }
      if (payRes.success && payRes.data) {
        setPayments(payRes.data.items || []);
      }
    } catch {
      setError('An unexpected error occurred while loading billing overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate Metrics
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
  const totalReceivable = invoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0);
  const draftInvoicesCount = invoices.filter((inv) => inv.status === 'DRAFT').length;

  const formatCurrency = (amt: number = 0) => {
    return '₹' + amt.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const columns: Column<ClientInvoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (inv) => (
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
          {inv.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Client / Account',
      render: (inv) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {inv.client?.companyName || 'Corporate Client'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {inv.client?.clientCode}
          </div>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Billing Period',
      render: (inv) => (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {new Date(inv.billingPeriodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          {' → '}
          {new Date(inv.billingPeriodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total Invoiced',
      render: (inv) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatCurrency(Number(inv.totalAmount || 0))}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Tax: {formatCurrency(Number(inv.totalTaxAmount || 0))}
          </div>
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Outstanding Due',
      render: (inv) => {
        const bal = Number(inv.balanceDue || 0);
        return (
          <span
            style={{
              fontWeight: 600,
              color: bal > 0 ? 'var(--accent-rose-text)' : 'var(--accent-emerald-text)',
            }}
          >
            {formatCurrency(bal)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => <StatusBadge status={inv.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (inv) => (
        <Link
          href={`/dashboard/billing/invoices/${inv.id}`}
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
        title="Billing & Receivables Ledger"
        subtitle="Corporate client invoicing, multi-site deployments reconciliation, GST taxation breakout, and payment receipts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Billing' },
        ]}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/dashboard/billing/payments" className="btn-secondary">
              <CreditCard size={15} /> Payment Records
            </Link>
            <Link href="/dashboard/billing/invoices" className="btn-primary">
              <Plus size={15} /> All Invoices
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
          title="Total Billed"
          value={formatCurrency(totalInvoiced)}
          icon={Receipt}
          subtext="Invoiced revenue"
          accentColor="#2563eb"
        />

        <StatCard
          title="Total Collections"
          value={formatCurrency(totalCollected)}
          icon={CheckCircle2}
          subtext="Realized bank inflows"
          accentColor="#10b981"
        />

        <StatCard
          title="Outstanding Due"
          value={formatCurrency(totalReceivable)}
          icon={Clock}
          subtext="Unpaid client balances"
          accentColor="#ef4444"
        />

        <StatCard
          title="Draft Invoices"
          value={draftInvoicesCount}
          icon={Coins}
          subtext="Pending issuance"
          accentColor="#f59e0b"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <Link
          href="/dashboard/billing/invoices"
          className="card card-interactive"
          style={{ padding: '16px 20px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={18} style={{ color: 'var(--accent-blue)' }} />
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Client Invoices Ledger
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Inspect billing runs, GST breakouts, and generate client bills
              </div>
            </div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--accent-blue)' }} />
        </Link>

        <Link
          href="/dashboard/billing/payments"
          className="card card-interactive"
          style={{ padding: '16px 20px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={18} style={{ color: 'var(--accent-blue)' }} />
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Payment Receipts & Reconciliations
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Record NEFT/RTGS collections, cheques, and credit adjustments
              </div>
            </div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--accent-blue)' }} />
        </Link>
      </div>

      {/* Recent Invoices Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Commercial Invoices
          </h2>
          <Link
            href="/dashboard/billing/invoices"
            style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}
          >
            All Invoices ({invoices.length}) →
          </Link>
        </div>

        <DataTable
          columns={columns}
          data={invoices}
          loading={loading}
          error={error}
          onRetry={loadData}
          emptyTitle="No Invoices Found"
          emptyDescription="Zero billing invoices generated yet. Create a billing cycle run."
        />
      </div>
    </DashboardLayout>
  );
}
