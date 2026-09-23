'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../../../components/DashboardLayout';
import { clientsApi, ClientDetailResponse } from '../../../../../lib/clients-api';
import { useAuth } from '../../../../../context/AuthContext';
import { 
  Building2, ArrowLeft, Save, AlertTriangle, 
  ShieldCheck, FileText, UserCheck, Lock 
} from 'lucide-react';

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [client, setClient] = useState<ClientDetailResponse | null>(null);
  const [form, setForm] = useState({
    companyName: '',
    legalName: '',
    billingAddress: '',
    contactPersonName: '',
    contactEmail: '',
    contactPhone: '',
    paymentTermsDays: 30,
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await clientsApi.getClientById(clientId);
        if (res.success && res.data) {
          setClient(res.data);
          setForm({
            companyName: res.data.companyName,
            legalName: res.data.legalName,
            billingAddress: res.data.billingAddress,
            contactPersonName: res.data.contactPersonName,
            contactEmail: res.data.contactEmail,
            contactPhone: res.data.contactPhone,
            paymentTermsDays: res.data.paymentTermsDays,
          });
        } else {
          setError(res.error?.message || 'Failed to load client');
        }
      } catch (err: any) {
        setError(err.message || 'Error communicating with server');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [clientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'paymentTermsDays') {
      setForm((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await clientsApi.updateClient(clientId, {
        companyName: form.companyName.trim(),
        legalName: form.legalName.trim(),
        billingAddress: form.billingAddress.trim(),
        contactPersonName: form.contactPersonName.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
        contactPhone: form.contactPhone.trim(),
        paymentTermsDays: form.paymentTermsDays,
      });

      if (res.success) {
        router.push(`/dashboard/clients/${clientId}`);
      } else {
        setError(res.error?.message || 'Failed to update client');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update client');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading Client...">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Retrieving client record for editing...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Edit: ${client?.companyName || 'Client'}`}
      subtitle={`Update operating details and commercial terms for ${client?.clientCode}`}
      action={
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
        >
          <ArrowLeft size={16} />
          Cancel & Return
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

        {/* Read-Only Statutory Identifiers Bar */}
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            <Lock size={15} color="#f59e0b" />
            <span>Statutory identifiers are immutable for audit compliance:</span>
          </div>

          <div style={{ display: 'flex', gap: '14px', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
            <span>Code: <strong>{client?.clientCode}</strong></span>
            <span>PAN: <strong>{client?.pan}</strong></span>
            <span>GSTIN: <strong>{client?.gstin}</strong></span>
            <span>Branch: <strong>{client?.branch?.branchCode || 'HQ'}</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px' }}>
          {/* Section 1: Company Names */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <Building2 size={20} color="var(--primary-400)" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Company Identification</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div>
                <label className="input-label">Operating Trade Name *</label>
                <input
                  type="text"
                  name="companyName"
                  required
                  className="input-field"
                  value={form.companyName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="input-label">Registered Legal Entity Name *</label>
                <input
                  type="text"
                  name="legalName"
                  required
                  className="input-field"
                  value={form.legalName}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Address & Payment Terms */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <FileText size={20} color="#f59e0b" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Billing Address & Credit Terms</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Registered Billing Address *</label>
                <textarea
                  name="billingAddress"
                  required
                  rows={3}
                  className="input-field"
                  value={form.billingAddress}
                  onChange={handleChange}
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
              </div>
            </div>
          </div>

          {/* Section 3: Contact Person */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
              <UserCheck size={20} color="#60a5fa" />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Primary Contact Person</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
              <div>
                <label className="input-label">Contact Person Name *</label>
                <input
                  type="text"
                  name="contactPersonName"
                  required
                  className="input-field"
                  value={form.contactPersonName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="input-label">Contact Email *</label>
                <input
                  type="email"
                  name="contactEmail"
                  required
                  className="input-field"
                  value={form.contactEmail}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="input-label">Contact Phone *</label>
                <input
                  type="tel"
                  name="contactPhone"
                  required
                  className="input-field"
                  value={form.contactPhone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <Link href={`/dashboard/clients/${clientId}`} className="btn-secondary" style={{ textDecoration: 'none' }}>
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}
            >
              <Save size={16} />
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
