'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { payrollApi, Payslip } from '@/lib/payroll-api';
import {
  FileText,
  Printer,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export default function PayslipDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayslip = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await payrollApi.getPayslipById(id);
      if (res.success && res.data) {
        setPayslip(res.data);
      } else {
        setError(res.error?.message || 'Failed to load payslip');
      }
    } catch {
      setError('An unexpected error occurred while loading payslip');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPayslip();
  }, [loadPayslip]);

  const handlePrint = () => {
    window.print();
  };

  const calc = payslip?.salaryCalculation;
  const snap = calc?.snapshotData || {};

  return (
    <DashboardLayout
      title={payslip ? `Payslip: ${payslip.payslipNumber}` : 'Payslip Details'}
      subtitle={payslip ? `Salary slip for ${new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'long' })} ${payslip.year}` : ''}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/dashboard/payslips"
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
            <ArrowLeft size={16} /> All Payslips
          </Link>

          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Printer size={16} /> Print Payslip
          </button>
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading payslip details...
        </div>
      ) : error || !payslip ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
          <div>{error || 'Payslip not found'}</div>
        </div>
      ) : (
        <div style={{
          maxWidth: '850px',
          margin: '0 auto',
          background: '#ffffff',
          color: '#1e293b',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
        }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  APEX MANPOWER SERVICES
                </h2>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
                  Facility Management & Workforce Solutions
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Statutory Salary Slip • Form XIX (Rule 78(1)(b))
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2563eb' }}>
                  {payslip.payslipNumber}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                  Pay Period: {new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'long' })} {payslip.year}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                  ✓ Published & Disbursed
                </div>
              </div>
            </div>
          </div>

          {/* Employee & Bank Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            background: '#f8fafc',
            borderRadius: '10px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            fontSize: '0.8125rem',
            marginBottom: '24px',
          }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.6875rem', fontWeight: 600 }}>EMPLOYEE NAME & CODE</div>
              <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {payslip.employee?.firstName} {payslip.employee?.lastName} ({payslip.employee?.employeeCode})
              </div>
              <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.6875rem', fontWeight: 600 }}>DESIGNATION</div>
              <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                {payslip.employee?.primaryDesignation?.name || payslip.employee?.primaryDesignation?.title || 'Security Guard'}
              </div>
              <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.6875rem', fontWeight: 600 }}>UAN / EPF NUMBER</div>
              <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                {payslip.employee?.uanNumber || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ color: '#64748b', fontSize: '0.6875rem', fontWeight: 600 }}>BANK ACCOUNT & IFSC</div>
              <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                {payslip.employee?.bankAccountNoMasked || 'XXXXXX1234'} • {payslip.employee?.bankIfsc || 'HDFC0001234'}
              </div>
              <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.6875rem', fontWeight: 600 }}>ESIC IP NUMBER</div>
              <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                {payslip.employee?.esicIpNumber || 'N/A'}
              </div>
              <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.6875rem', fontWeight: 600 }}>DAYS WORKED</div>
              <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                {calc?.payableDays || 0} Payable Days (Total Calendar: {calc?.totalCalendarDays || 30})
              </div>
            </div>
          </div>

          {/* Earnings vs Deductions Table */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#f1f5f9',
              borderBottom: '1px solid #cbd5e1',
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: '#334155',
            }}>
              <div style={{ padding: '10px 16px', borderRight: '1px solid #cbd5e1' }}>EARNINGS (₹)</div>
              <div style={{ padding: '10px 16px' }}>STATUTORY & OTHER DEDUCTIONS (₹)</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '0.8125rem' }}>
              {/* Earnings Column */}
              <div style={{ padding: '14px 16px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Basic Pay</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(calc?.basicPay || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dearness Allowance (DA)</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(calc?.dearnessAllowance || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>House Rent Allowance (HRA)</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(calc?.houseRentAllowance || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Conveyance Allowance</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(calc?.conveyanceAllowance || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Special Allowance</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(calc?.specialAllowance || 0).toLocaleString('en-IN')}</span>
                </div>
                {calc && calc.overtimeHours > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Overtime ({calc.overtimeHours} hrs)</span>
                    <span style={{ fontWeight: 600 }}>₹{Number(calc.overtimeAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Deductions Column */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Employee PF (EPF)</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>₹{Number(calc?.epfEmployee || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Employee ESIC</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>₹{Number(calc?.esiEmployee || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Professional Tax (PT)</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>₹{Number(calc?.professionalTax || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Labour Welfare Fund (LWF)</span>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>₹{Number(calc?.labourWelfareFund || 0).toLocaleString('en-IN')}</span>
                </div>
                {calc && calc.advanceDeduction > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Salary Advance Recovery</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>₹{Number(calc.advanceDeduction).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Totals Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#f8fafc',
              borderTop: '1px solid #cbd5e1',
              fontWeight: 700,
              fontSize: '0.875rem',
              color: '#0f172a',
            }}>
              <div style={{ padding: '12px 16px', borderRight: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Gross Earnings:</span>
                <span>₹{Number(payslip.grossEarnings || 0).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                <span>Total Deductions:</span>
                <span>-₹{Number(payslip.totalDeductions || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Net Salary Box */}
          <div style={{
            background: '#ecfdf5',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857' }}>NET TAKE-HOME DISBURSED</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>
                ₹{Number(payslip.netPay || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#047857' }}>
              <div>Mode: Direct Bank Transfer (NEFT/RTGS)</div>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>Status: Credit Successful</div>
            </div>
          </div>

          {/* Employer Statutory Contributions Footer */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '16px',
            fontSize: '0.75rem',
            color: '#64748b',
            lineHeight: 1.5,
          }}>
            <div><strong>Employer Statutory Contributions (Not Deducted from Wage):</strong></div>
            <div>• EPF / EPS: Employer contributes 3.67% EPF + 8.33% EPS (₹{Number(calc?.epfEmployer || 0) + Number(calc?.epsEmployer || 0)})</div>
            <div>• ESIC: Employer contributes 3.25% (₹{Number(calc?.esiEmployer || 0)})</div>
            <div style={{ marginTop: '8px', fontSize: '0.6875rem' }}>
              Note: This is a system generated statutory salary document and requires no physical signature.
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
