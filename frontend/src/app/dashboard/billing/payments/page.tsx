'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { billingApi, ClientPayment, PaymentMode } from '@/lib/billing-api';
import {
  Coins,
  Receipt,
  Plus,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  CreditCard,
  FileCheck,
} from 'lucide-react';

export default function ClientPaymentsPage() {
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [recording, setRecording] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientInvoiceId, setClientInvoiceId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [tdsDeducted, setTdsDeducted] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('BANK_TRANSFER');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transRef, setTransRef] = useState('');
  const [branchId, setBranchId] = useState('');
  const [notes, setNotes] = useState('');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await billingApi.getPayments({ limit: 50 });
      if (res.success && res.data) {
        setPayments(res.data.items || []);
      } else {
        setError(res.error?.message || 'Failed to load payments ledger');
      }
    } catch {
      setError('An unexpected error occurred while loading payment receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecording(true);
    setFormError(null);
    try {
      const res = await billingApi.recordPayment({
        branchId: branchId || 'default-branch',
        clientId,
        clientInvoiceId,
        amount: Number(amount),
        tdsDeducted: Number(tdsDeducted),
        paymentMode,
        transactionReference: transRef || undefined,
        paymentDate,
        notes: notes || undefined,
      });
      if (res.success) {
        setShowModal(false);
        loadPayments();
      } else {
        setFormError(res.error?.message || 'Failed to record payment');
      }
    } catch {
      setFormError('Failed to record payment receipt. Please verify invoice and client identifiers.');
    } finally {
      setRecording(false);
    }
  };

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalTds = payments.reduce((sum, p) => sum + Number(p.tdsDeducted || 0), 0);

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const num = (p.paymentReceiptNumber || '').toLowerCase();
    const clientName = (p.client?.companyName || '').toLowerCase();
    const invNum = (p.clientInvoice?.invoiceNumber || '').toLowerCase();
    return num.includes(q) || clientName.includes(q) || invNum.includes(q);
  });

  return (
    <DashboardLayout
      title="Client Payments & TDS Collections"
      subtitle="Track receipts, bank transfers, cheques, and client statutory tax deductions (TDS)"
      action={
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
          }}
        >
          <Plus size={16} /> Record Payment Receipt
        </button>
      }
    >
      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>CUMULATIVE COLLECTIONS</span>
            <Coins size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
            ₹{totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Direct funds credited to agency bank accounts
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>TDS DEDUCTED BY CLIENTS</span>
            <FileCheck size={20} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366f1' }}>
            ₹{totalTds.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Tax withheld (Form 16A reconciliation credit)
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>RECEIPTS ISSUED</span>
            <Receipt size={20} color="var(--primary-400)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {payments.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Automated sequential payment receipts
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '320px' }}>
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
              placeholder="Search receipt, client, or invoice..."
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

        <button
          onClick={loadPayments}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
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

      {/* Payments Table */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading payments...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <div>{error}</div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Coins size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Payment Receipts Found</div>
            <div style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
              Record client remittance receipts against generated tax invoices.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Receipt Number</th>
                <th style={{ padding: '12px 16px' }}>Client</th>
                <th style={{ padding: '12px 16px' }}>Invoice</th>
                <th style={{ padding: '12px 16px' }}>Payment Date</th>
                <th style={{ padding: '12px 16px' }}>Mode</th>
                <th style={{ padding: '12px 16px' }}>TDS Withheld</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{p.paymentReceiptNumber}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{p.client?.companyName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.client?.clientCode}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {p.clientInvoice ? (
                      <Link
                        href={`/dashboard/billing/invoices/${p.clientInvoiceId}`}
                        prefetch={false}
                        style={{ color: 'var(--primary-400)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {p.clientInvoice.invoiceNumber}
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{p.clientInvoiceId}</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      {p.paymentMode}
                    </span>
                    {p.transactionReference && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Ref: {p.transactionReference}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: p.tdsDeducted > 0 ? '#6366f1' : 'var(--text-muted)' }}>
                    {p.tdsDeducted > 0 ? `₹${Number(p.tdsDeducted).toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                    +₹{Number(p.amount || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Payment Modal */}
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
            maxWidth: '500px',
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
                <Plus size={18} color="#10b981" />
                Record Client Payment Receipt
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ padding: '24px' }}>
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
                    placeholder="e.g. client-id"
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Client Invoice Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. inv-id"
                    value={clientInvoiceId}
                    onChange={(e) => setClientInvoiceId(e.target.value)}
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
                      Amount Paid (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
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
                      TDS Withheld (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tdsDeducted}
                      onChange={(e) => setTdsDeducted(Number(e.target.value))}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Payment Mode *
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
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
                    Transaction Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR number, Bank Ref ID"
                    value={transRef}
                    onChange={(e) => setTransRef(e.target.value)}
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
                  disabled={recording}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {recording ? 'Recording...' : 'Record Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
