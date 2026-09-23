'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { billingApi, ClientInvoice, InvoiceAdjustmentType, PaymentMode } from '@/lib/billing-api';
import {
  Receipt,
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Coins,
  CreditCard,
  Plus,
  X,
  Clock,
} from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<ClientInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Adjustment Modal State
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjType, setAdjType] = useState<InvoiceAdjustmentType>('CREDIT_NOTE');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjTax, setAdjTax] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('');

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [tdsDeducted, setTdsDeducted] = useState<number>(0);
  const [payMode, setPayMode] = useState<PaymentMode>('BANK_TRANSFER');
  const [transRef, setTransRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await billingApi.getInvoiceById(id);
      if (res.success && res.data) {
        setInvoice(res.data);
      } else {
        setError(res.error?.message || 'Failed to load tax invoice');
      }
    } catch {
      setError('An unexpected error occurred while loading invoice details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleFinalize = async () => {
    if (!id || processing) return;
    const confirm = window.confirm('Finalize and lock this commercial tax invoice? This locks invoice lines from further changes.');
    if (!confirm) return;

    setProcessing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await billingApi.finalizeInvoice(id);
      if (res.success && res.data) {
        setInvoice(res.data);
        setSuccessMsg('Invoice finalized and locked successfully!');
      } else {
        setError(res.error?.message || 'Failed to finalize invoice');
      }
    } catch {
      setError('Failed to finalize invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || processing) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await billingApi.createAdjustment(id, {
        adjustmentType: adjType,
        amount: Number(adjAmount),
        taxAdjustmentAmount: Number(adjTax),
        reason: adjReason,
      });
      if (res.success) {
        setShowAdjModal(false);
        setSuccessMsg(`${adjType === 'CREDIT_NOTE' ? 'Credit Note' : 'Debit Note'} issued successfully!`);
        loadInvoice();
      } else {
        setError(res.error?.message || 'Failed to issue adjustment');
      }
    } catch {
      setError('Failed to issue adjustment note');
    } finally {
      setProcessing(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !invoice || processing) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await billingApi.recordPayment({
        branchId: invoice.branchId,
        clientId: invoice.clientId,
        clientInvoiceId: invoice.id,
        amount: Number(payAmount),
        tdsDeducted: Number(tdsDeducted),
        paymentMode: payMode,
        transactionReference: transRef || undefined,
        paymentDate: payDate,
        notes: payNotes || undefined,
      });
      if (res.success) {
        setShowPayModal(false);
        setSuccessMsg('Client payment receipt recorded successfully!');
        loadInvoice();
      } else {
        setError(res.error?.message || 'Failed to record payment');
      }
    } catch {
      setError('Failed to record payment receipt');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout
      title={invoice ? `Invoice: ${invoice.invoiceNumber}` : 'Tax Invoice Details'}
      subtitle={invoice ? `GST Tax Invoice • ${invoice.client?.companyName} • FY ${invoice.financialYear}` : ''}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/dashboard/billing/invoices"
            prefetch={false}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} /> All Invoices
          </Link>

          {invoice && invoice.status === 'DRAFT' && (
            <button
              onClick={handleFinalize}
              disabled={processing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid var(--primary-500)',
                color: 'var(--primary-400)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: processing ? 'not-allowed' : 'pointer',
              }}
            >
              <FileCheck size={16} /> Finalize Invoice
            </button>
          )}

          {invoice && invoice.isLocked && (
            <button
              onClick={() => {
                setAdjAmount(0);
                setAdjTax(0);
                setAdjReason('');
                setShowAdjModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <CreditCard size={16} /> Issue Adjustment
            </button>
          )}

          {invoice && invoice.balanceDue > 0 && (
            <button
              onClick={() => {
                setPayAmount(Number(invoice.balanceDue));
                setTdsDeducted(0);
                setTransRef('');
                setShowPayModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Coins size={16} /> Record Payment
            </button>
          )}

          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Printer size={16} /> Print
          </button>
        </div>
      }
    >
      {/* Notifications */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#ef4444',
          fontSize: '0.875rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          color: '#10b981',
          fontSize: '0.875rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading commercial invoice...
        </div>
      ) : !invoice ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Invoice not found.
        </div>
      ) : (
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          background: '#ffffff',
          color: '#1e293b',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
        }}>
          {/* Top Company Header */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  APEX MANPOWER SERVICES
                </h2>
                <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '4px' }}>
                  Branch: {invoice.branch?.branchName || 'Chennai HQ'} (Code: {invoice.branch?.branchCode || 'CHN'})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  GSTIN: 33AAAAA0000A1Z5 • State Code: {invoice.branch?.stateCode || '33'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  display: 'inline-block',
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}>
                  TAX INVOICE
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#2563eb' }}>
                  {invoice.invoiceNumber}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '2px' }}>
                  Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Billed To & Invoice Metadata */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
            background: '#f8fafc',
            borderRadius: '10px',
            padding: '16px 20px',
            border: '1px solid #e2e8f0',
            fontSize: '0.8125rem',
            marginBottom: '24px',
          }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.6875rem', fontWeight: 700 }}>BILLED TO:</div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9375rem', marginTop: '2px' }}>
                {invoice.client?.companyName}
              </div>
              <div style={{ color: '#475569', marginTop: '4px' }}>
                Client Code: {invoice.client?.clientCode}
              </div>
              <div style={{ color: '#475569', marginTop: '2px' }}>
                GSTIN: {invoice.client?.gstin || 'Unregistered / Exempt'}
              </div>
              <div style={{ color: '#475569', marginTop: '2px' }}>
                Place of Supply: State Code {invoice.client?.billingStateCode || '33'}
              </div>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.6875rem', fontWeight: 700 }}>BILLING PERIOD & TERMS:</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                {new Date(invoice.billingPeriodStart).toLocaleDateString()} to {new Date(invoice.billingPeriodEnd).toLocaleDateString()}
              </div>
              <div style={{ color: '#475569', marginTop: '4px' }}>
                Financial Year: {invoice.financialYear}
              </div>
              <div style={{ color: '#475569', marginTop: '2px' }}>
                Payment Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Immediate'}
              </div>
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  background: invoice.status === 'PAID' ? '#dcfce7' : '#fef3c7',
                  color: invoice.status === 'PAID' ? '#166534' : '#92400e',
                }}>
                  STATUS: {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '10px 14px' }}>#</th>
                <th style={{ padding: '10px 14px' }}>Description of Services / Deployment</th>
                <th style={{ padding: '10px 14px' }}>SAC Code</th>
                <th style={{ padding: '10px 14px' }}>Quantity / Shifts</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Unit Rate (₹)</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.itemDescription}</div>
                    {item.siteName && (
                      <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        Site: {item.siteName} {item.employeeName ? `• Worker: ${item.employeeName} (${item.employeeCode})` : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{item.hsnSacCode || '998512'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {item.quantity} {item.totalShiftHours ? `(${item.totalShiftHours} hrs)` : 'units'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                    ₹{Number(item.unitRate || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    ₹{Number(item.lineTotal || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tax Calculation & Financial Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Bank Payment Details for Settlement:
              </div>
              <div>Account Name: Apex Manpower Services Pvt Ltd</div>
              <div>Bank: HDFC Bank Ltd • Current Account</div>
              <div>A/C Number: 50200012345678</div>
              <div>IFSC Code: HDFC0001234 • Branch: Chennai Central</div>
              {invoice.notes && (
                <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#64748b' }}>
                  Notes: {invoice.notes}
                </div>
              )}
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px 20px',
              fontSize: '0.8125rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sub-Total:</span>
                <span style={{ fontWeight: 600 }}>₹{Number(invoice.subTotal || 0).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Taxable Amount:</span>
                <span style={{ fontWeight: 600 }}>₹{Number(invoice.taxableAmount || 0).toLocaleString('en-IN')}</span>
              </div>

              {/* GST Tax Engine Split */}
              {invoice.cgstAmount > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                    <span>CGST ({invoice.cgstRate}%):</span>
                    <span style={{ fontWeight: 600 }}>₹{Number(invoice.cgstAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                    <span>SGST ({invoice.sgstRate}%):</span>
                    <span style={{ fontWeight: 600 }}>₹{Number(invoice.sgstAmount).toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
              {invoice.igstAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                  <span>IGST ({invoice.igstRate}%):</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(invoice.igstAmount).toLocaleString('en-IN')}</span>
                </div>
              )}

              {invoice.creditAdjustmentAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Credit Notes Applied:</span>
                  <span style={{ fontWeight: 600 }}>-₹{Number(invoice.creditAdjustmentAmount).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div style={{
                borderTop: '2px solid #0f172a',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem',
                fontWeight: 900,
                color: '#0f172a',
              }}>
                <span>Total Invoice:</span>
                <span>₹{Number(invoice.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                <span>Paid Amount:</span>
                <span>₹{Number(invoice.paidAmount || 0).toLocaleString('en-IN')}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: invoice.balanceDue > 0 ? '#b45309' : '#16a34a',
                fontWeight: 800,
                fontSize: '0.9375rem',
              }}>
                <span>Balance Due:</span>
                <span>₹{Number(invoice.balanceDue || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Adjustments Section */}
          {(invoice.adjustments || []).length > 0 && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', marginBottom: '8px' }}>
                Issued Credit / Debit Notes ({invoice.adjustments?.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invoice.adjustments?.map((adj) => (
                  <div key={adj.id} style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, color: adj.adjustmentType === 'CREDIT_NOTE' ? '#dc2626' : '#2563eb' }}>
                        {adj.adjustmentType}: {adj.noteNumber}
                      </span>
                      <span style={{ marginLeft: '8px', color: '#64748b' }}>Reason: {adj.reason}</span>
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      ₹{Number(adj.totalAdjustmentAmount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Receipts Section */}
          {(invoice.payments || []).length > 0 && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', marginBottom: '8px' }}>
                Receipt History ({invoice.payments?.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {invoice.payments?.map((pay) => (
                  <div key={pay.id} style={{
                    padding: '8px 12px',
                    background: '#f0fdf4',
                    borderRadius: '6px',
                    border: '1px solid #bbf7d0',
                    fontSize: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#166534' }}>
                        Receipt: {pay.paymentReceiptNumber} ({pay.paymentMode})
                      </span>
                      <span style={{ marginLeft: '8px', color: '#15803d' }}>
                        Date: {new Date(pay.paymentDate).toLocaleDateString()} {pay.tdsDeducted > 0 ? `• TDS: ₹${pay.tdsDeducted}` : ''}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, color: '#166534' }}>
                      +₹{Number(pay.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Credit/Debit Note Modal */}
      {showAdjModal && (
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
            maxWidth: '440px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Issue Adjustment Note</h3>
              <button onClick={() => setShowAdjModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Adjustment Type
                </label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as InvoiceAdjustmentType)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="CREDIT_NOTE">Credit Note (Discount / Shortage Reduction)</option>
                  <option value="DEBIT_NOTE">Debit Note (Additional Service Surcharge)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Base Adjustment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  GST Tax Adjustment Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adjTax}
                  onChange={(e) => setAdjTax(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guard replacement discrepancy"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Issue Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && (
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
            maxWidth: '440px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Record Client Payment</h3>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Amount Paid (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  TDS Deducted by Client (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tdsDeducted}
                  onChange={(e) => setTdsDeducted(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Payment Mode *
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Transaction Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR number, Cheque number"
                  value={transRef}
                  onChange={(e) => setTransRef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Record Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
