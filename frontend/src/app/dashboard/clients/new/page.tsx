'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../../components/DashboardLayout';
import { clientsApi } from '../../../../lib/clients-api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Building2, ArrowLeft, Save, AlertTriangle, 
  CheckCircle2, FileText, UserCheck, ShieldCheck 
} from 'lucide-react';

export default function NewClientPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientCode: '',
    companyName: '',
    legalName: '',
    pan: '',
    gstin: '',
    stateCode: '33', // Default Tamil Nadu
    billingAddress: '',
    contactPersonName: '',
    contactEmail: '',
    contactPhone: '',
    paymentTermsDays: 30,
    branchId: user?.branch?.id || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'pan' || name === 'clientCode' || name === 'gstin') {
      setForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      // Auto-populate stateCode from first 2 digits of GSTIN if typed
      if (name === 'gstin' && value.length >= 2) {
        const prefix = value.substring(0, 2);
        if (/^\d{2}$/.test(prefix)) {
          setForm((prev) => ({ ...prev, stateCode: prefix }));
        }
      }
    } else if (name === 'paymentTermsDays') {
      setForm((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Indian GSTIN & PAN sanity checks
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(form.pan)) {
      setError('Invalid PAN format. Must be 10 characters (e.g. AABCA1234F)');
      return;
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(form.gstin)) {
      setError('Invalid Indian GSTIN format. Must be 15 characters (e.g. 33ABCDE1234F1Z5)');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        clientCode: form.clientCode.trim(),
        companyName: form.companyName.trim(),
        legalName: form.legalName.trim(),
        pan: form.pan.trim(),
        gstin: form.gstin.trim(),
        stateCode: form.stateCode.trim(),
        billingAddress: form.billingAddress.trim(),
        contactPersonName: form.contactPersonName.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
        contactPhone: form.contactPhone.trim(),
        paymentTermsDays: form.paymentTermsDays,
      };

      if (!user?.branch && form.branchId) {
        payload.branchId = form.branchId;
      }

      const res = await clientsApi.createClient(payload);
      if (res.success && res.data) {
        router.push(`/dashboard/clients/${res.data.id}`);
      } else {
        setError(res.error?.message || 'Failed to create client record');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Add New Client"
      subtitle="Register an Indian corporate entity or client organization under authorized branch operations"
      action={
        <Link
          href="/dashboard/clients"
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
        >
          <ArrowLeft size={16} />
          Back to Directory
        </Link>
      }
    >
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        {error && (
          <div style={{
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#f87171',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.875rem'
          }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px' }}>
          {/* Section 1: Entity Profile */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <Building2 size={20} color="var(--primary-400)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Company Information</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div>
                <label className="input-label">Client Code * (Unique)</label>
                <input
                  type="text"
                  name="clientCode"
                  required
                  placeholder="e.g. CLI-CHN-001"
                  className="input-field"
                  value={form.clientCode}
                  onChange={handleChange}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Identifier within the branch</span>
              </div>

              <div>
                <label className="input-label">Operating Trade Name *</label>
                <input
                  type="text"
                  name="companyName"
                  required
                  placeholder="e.g. TVS Logistics Services"
                  className="input-field"
                  value={form.companyName}
                  onChange={handleChange}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Registered Legal Entity Name *</label>
                <input
                  type="text"
                  name="legalName"
                  required
                  placeholder="e.g. TVS Supply Chain Solutions Private Limited"
                  className="input-field"
                  value={form.legalName}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Indian Statutory & Tax IDs */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <ShieldCheck size={20} color="#10b981" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Statutory & Tax Identification (India)</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div>
                <label className="input-label">PAN (Income Tax) *</label>
                <input
                  type="text"
                  name="pan"
                  required
                  maxLength={10}
                  placeholder="e.g. AABCA1234F"
                  className="input-field"
                  value={form.pan}
                  onChange={handleChange}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label className="input-label">GSTIN (15 Digits) *</label>
                <input
                  type="text"
                  name="gstin"
                  required
                  maxLength={15}
                  placeholder="e.g. 33AABCA1234F1Z5"
                  className="input-field"
                  value={form.gstin}
                  onChange={handleChange}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label className="input-label">State Code (GST) *</label>
                <input
                  type="text"
                  name="stateCode"
                  required
                  maxLength={2}
                  placeholder="33"
                  className="input-field"
                  value={form.stateCode}
                  onChange={handleChange}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>33 = Tamil Nadu, 29 = Karnataka, 27 = MH</span>
              </div>
            </div>
          </div>

          {/* Section 3: Billing Address & Commercial Terms */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <FileText size={20} color="#f59e0b" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Billing Address & Payment Terms</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Registered Billing Address *</label>
                <textarea
                  name="billingAddress"
                  required
                  rows={3}
                  placeholder="Complete registered commercial address including City and PIN Code..."
                  className="input-field"
                  value={form.billingAddress}
                  onChange={handleChange}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="input-label">Payment Terms (Days Credit)</label>
                <input
                  type="number"
                  name="paymentTermsDays"
                  min={0}
                  max={180}
                  className="input-field"
                  value={form.paymentTermsDays}
                  onChange={handleChange}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Standard credit window (e.g. 30 days)</span>
              </div>
            </div>
          </div>

          {/* Section 4: Primary Contact Person */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <UserCheck size={20} color="#60a5fa" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Primary Contact Person</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div>
                <label className="input-label">Contact Person Full Name *</label>
                <input
                  type="text"
                  name="contactPersonName"
                  required
                  placeholder="e.g. S. Ramanathan"
                  className="input-field"
                  value={form.contactPersonName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="input-label">Contact Email Address *</label>
                <input
                  type="email"
                  name="contactEmail"
                  required
                  placeholder="ramanathan@tvs.in"
                  className="input-field"
                  value={form.contactEmail}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="input-label">Contact Phone Number *</label>
                <input
                  type="tel"
                  name="contactPhone"
                  required
                  placeholder="e.g. +91 98401 23456"
                  className="input-field"
                  value={form.contactPhone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <Link href="/dashboard/clients" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}
            >
              <Save size={16} />
              {loading ? 'Registering...' : 'Register Client'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
