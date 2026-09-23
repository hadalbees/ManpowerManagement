'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { billingApi, ClientInvoice, InvoiceStatus } from '@/lib/billing-api';
import {
  Receipt,
  Plus,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
  Search,
} from 'lucide-react';

export default function InvoicesListingPage() {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate Invoice Modal
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState('');
  const [clientId, setClientId] = useState('');
  const [billingPeriodStart, setBillingPeriodStart] = useState('');
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await billingApi.getInvoices({
        status: statusFilter !== 'ALL' ? (statusFilter as InvoiceStatus) : undefined,
        limit: 50,
      });
      if (res.success && res.data) {
        setInvoices(res.data.items || []);
      } else {
        setError(res.error?.message || 'Failed to load commercial invoices');
      }
    } catch {
      setError('An unexpected error occurred while fetching invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setFormError(null);
    try {
      const res = await billingApi.generateInvoice({
        branchId: branchId || 'default-branch',
        clientId,
        billingPeriodStart,
        billingPeriodEnd,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      });
      if (res.success) {
        setShowModal(false);
        loadInvoices();
      } else {
        setFormError(res.error?.message || 'Failed to generate invoice');
      }
    } catch {
      setFormError('Failed to generate commercial tax invoice. Please check parameters.');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
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
            <CheckCircle2 size={12} /> PAID
          </span>
        );
      case 'PARTIALLY_PAID':
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
            <Clock size={12} /> PARTIAL
          </span>
        );
      case 'APPROVED':
      case 'SENT':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(147, 51, 234, 0.15)',
            color: '#a855f7',
            border: '1px solid rgba(147, 51, 234, 0.3)',
          }}>
            <FileCheck size={12} /> FINALIZED
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

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const num = (inv.invoiceNumber || '').toLowerCase();
    const clientName = (inv.client?.companyName || '').toLowerCase();
    return num.includes(q) || clientName.includes(q);
  });

  return (
    <DashboardLayout
      title="Commercial Tax Invoices"
      subtitle="Generate, review, finalize, and track GST compliant invoices for client commercial contracts"
      action={
        <button
          onClick={() => setShowModal(true)}
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
          <Plus size={16} /> Generate Tax Invoice
        </button>
      }
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'DRAFT', 'APPROVED', 'PARTIALLY_PAID', 'PAID'].map((st) => (
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '6px 12px',
            width: '240px',
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search invoice or client..."
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

          <button
            onClick={loadInvoices}
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

      {/* Invoices Table */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading invoices...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <div>{error}</div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Receipt size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Invoices Found</div>
            <div style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
              Click "Generate Tax Invoice" to bill clients for verified shifts and deployments.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Invoice Number</th>
                <th style={{ padding: '12px 16px' }}>Client</th>
                <th style={{ padding: '12px 16px' }}>Billing Period</th>
                <th style={{ padding: '12px 16px' }}>Taxable Amt</th>
                <th style={{ padding: '12px 16px' }}>GST Tax</th>
                <th style={{ padding: '12px 16px' }}>Total Amount</th>
                <th style={{ padding: '12px 16px' }}>Balance Due</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.client?.companyName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.client?.clientCode}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {new Date(inv.billingPeriodStart).toLocaleDateString()} - {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    ₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    ₹{Number(inv.totalTaxAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px', color: inv.balanceDue > 0 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                    ₹{Number(inv.balanceDue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>{getStatusBadge(inv.status)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/dashboard/billing/invoices/${inv.id}`}
                      prefetch={false}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
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
                      <Eye size={14} /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Invoice Modal */}
      {showModal && (
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
            maxWidth: '520px',
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
                Generate Client Tax Invoice
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateInvoice} style={{ padding: '24px' }}>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Client Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. client-id or uuid"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Period Start *
                    </label>
                    <input
                      type="date"
                      required
                      value={billingPeriodStart}
                      onChange={(e) => setBillingPeriodStart(e.target.value)}
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

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Period End *
                    </label>
                    <input
                      type="date"
                      required
                      value={billingPeriodEnd}
                      onChange={(e) => setBillingPeriodEnd(e.target.value)}
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Branch Identifier (Optional if user has branch assigned)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. branch-id or leave empty for user branch"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Invoice Remarks / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Security & facility management services for October"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  disabled={generating}
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
                  {generating ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
