'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../../components/DashboardLayout';
import { 
  clientsApi, ClientDetailResponse, ClientSiteItem, 
  ClientContractItem, ClientBillingRateItem 
} from '../../../../lib/clients-api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Building2, ArrowLeft, Edit3, MapPin, FileText, 
  DollarSign, Plus, CheckCircle2, AlertTriangle, Calendar,
  Clock, Shield, User, Phone, Mail, History, RefreshCw, X
} from 'lucide-react';

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const [client, setClient] = useState<ClientDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sites' | 'contracts' | 'rates'>('overview');

  // Modal States
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [selectedRateForRevision, setSelectedRateForRevision] = useState<ClientBillingRateItem | null>(null);

  // Form States
  const [siteForm, setSiteForm] = useState({
    siteCode: '',
    siteName: '',
    address: '',
    city: '',
    stateCode: '33',
    pincode: '',
    siteSupervisorName: '',
    siteSupervisorPhone: '',
  });

  const [contractForm, setContractForm] = useState({
    contractNumber: '',
    title: '',
    startDate: '',
    endDate: '',
    billingCycle: 'MONTHLY',
    noticePeriodDays: 30,
    autoRenew: false,
    notes: '',
  });

  const [rateForm, setRateForm] = useState({
    clientSiteId: '',
    designationId: '',
    billingModel: 'MONTHLY_FIXED',
    rateAmount: '',
    standardShiftHours: '8',
    otHourlyRate: '0',
    effectiveFrom: '',
    effectiveTo: '',
  });

  const [reviseForm, setReviseForm] = useState({
    newRateAmount: '',
    newEffectiveFrom: '',
    newOtHourlyRate: '',
    newStandardShiftHours: '',
    reason: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canUpdate = user?.effectivePermissions?.includes('CLIENT_UPDATE');

  const fetchClientDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientsApi.getClientById(clientId);
      if (res.success && res.data) {
        setClient(res.data);
      } else {
        setError(res.error?.message || 'Client record not found');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  // Handlers for Modals & Sub-resources
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await clientsApi.createSite(clientId, siteForm);
      if (res.success) {
        setShowSiteModal(false);
        setSiteForm({
          siteCode: '',
          siteName: '',
          address: '',
          city: '',
          stateCode: client?.stateCode || '33',
          pincode: '',
          siteSupervisorName: '',
          siteSupervisorPhone: '',
        });
        fetchClientDetails();
      } else {
        setActionError(res.error?.message || 'Failed to create site');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to create site');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await clientsApi.createContract(clientId, {
        ...contractForm,
        noticePeriodDays: Number(contractForm.noticePeriodDays),
      });
      if (res.success) {
        setShowContractModal(false);
        setContractForm({
          contractNumber: '',
          title: '',
          startDate: '',
          endDate: '',
          billingCycle: 'MONTHLY',
          noticePeriodDays: 30,
          autoRenew: false,
          notes: '',
        });
        fetchClientDetails();
      } else {
        setActionError(res.error?.message || 'Failed to create contract');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to create contract');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await clientsApi.createBillingRate(clientId, {
        clientSiteId: rateForm.clientSiteId || undefined,
        designationId: rateForm.designationId,
        billingModel: rateForm.billingModel,
        rateAmount: parseFloat(rateForm.rateAmount),
        standardShiftHours: parseFloat(rateForm.standardShiftHours),
        otHourlyRate: parseFloat(rateForm.otHourlyRate || '0'),
        effectiveFrom: rateForm.effectiveFrom,
        effectiveTo: rateForm.effectiveTo || undefined,
      });
      if (res.success) {
        setShowRateModal(false);
        setRateForm({
          clientSiteId: '',
          designationId: '',
          billingModel: 'MONTHLY_FIXED',
          rateAmount: '',
          standardShiftHours: '8',
          otHourlyRate: '0',
          effectiveFrom: '',
          effectiveTo: '',
        });
        fetchClientDetails();
      } else {
        setActionError(res.error?.message || 'Failed to create billing rate');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to create billing rate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviseRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRateForRevision) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await clientsApi.createNewRateVersion(clientId, selectedRateForRevision.id, {
        newRateAmount: parseFloat(reviseForm.newRateAmount),
        newEffectiveFrom: reviseForm.newEffectiveFrom,
        newOtHourlyRate: reviseForm.newOtHourlyRate ? parseFloat(reviseForm.newOtHourlyRate) : undefined,
        newStandardShiftHours: reviseForm.newStandardShiftHours ? parseFloat(reviseForm.newStandardShiftHours) : undefined,
        reason: reviseForm.reason || undefined,
      });
      if (res.success) {
        setShowReviseModal(false);
        setSelectedRateForRevision(null);
        setReviseForm({
          newRateAmount: '',
          newEffectiveFrom: '',
          newOtHourlyRate: '',
          newStandardShiftHours: '',
          reason: '',
        });
        fetchClientDetails();
      } else {
        setActionError(res.error?.message || 'Failed to revise billing rate');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to revise billing rate');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading Client...">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Retrieving client profile, active contracts, and rate cards...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !client) {
    return (
      <DashboardLayout title="Error">
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={48} color="#f87171" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Unable to load client</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'Client not found or access denied.'}</p>
          <Link href="/dashboard/clients" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Return to Client Directory
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={client.companyName}
      subtitle={`${client.clientCode} · ${client.legalName}`}
      action={
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/dashboard/clients"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 14px', fontSize: '0.8125rem' }}
          >
            <ArrowLeft size={15} />
            Back
          </Link>

          {canUpdate && (
            <Link
              href={`/dashboard/clients/${client.id}/edit`}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 14px', fontSize: '0.8125rem' }}
            >
              <Edit3 size={15} />
              Edit Profile
            </Link>
          )}
        </div>
      }
    >
      {/* Top Banner Status Bar */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className={`status-badge ${
            client.status === 'ACTIVE' 
              ? 'status-active' 
              : client.status === 'BLACKLISTED' 
                ? 'status-expired' 
                : 'status-draft'
          }`} style={{ fontSize: '0.8125rem', padding: '6px 14px' }}>
            {client.status}
          </span>

          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Branch: <strong style={{ color: 'var(--text-primary)' }}>{client.branch?.branchName || 'HQ'} ({client.branch?.branchCode || 'HQ'})</strong>
          </span>

          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Terms: <strong style={{ color: 'var(--text-primary)' }}>{client.paymentTermsDays} Days Credit</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
          <span style={{ background: 'var(--bg-surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            GSTIN: <strong>{client.gstin}</strong>
          </span>
          <span style={{ background: 'var(--bg-surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            PAN: <strong>{client.pan}</strong>
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
        {[
          { id: 'overview', label: 'Overview', icon: Building2 },
          { id: 'sites', label: `Client Sites (${client.sites?.length || 0})`, icon: MapPin },
          { id: 'contracts', label: `Contracts (${client.contracts?.length || 0})`, icon: FileText },
          { id: 'rates', label: `Billing Rates (${client.billingRates?.length || 0})`, icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                borderBottom: isActive ? '2px solid var(--primary-500)' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={isActive ? 'var(--primary-400)' : 'var(--text-muted)'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Company & Legal Info */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="var(--primary-400)" />
              Organization Master
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Operating Trade Name</div>
                <div style={{ fontWeight: 600 }}>{client.companyName}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Registered Legal Entity Name</div>
                <div style={{ fontWeight: 600 }}>{client.legalName}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Client Code</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{client.clientCode}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Operating Branch</div>
                <div>{client.branch?.branchName} ({client.branch?.branchCode})</div>
              </div>
            </div>
          </div>

          {/* Primary Contact */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="#60a5fa" />
              Primary Contact Person
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Contact Person</div>
                <div style={{ fontWeight: 600 }}>{client.contactPersonName}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Phone Number</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="var(--text-muted)" />
                  {client.contactPhone}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Email Address</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="var(--text-muted)" />
                  {client.contactEmail}
                </div>
              </div>
            </div>
          </div>

          {/* Billing & Tax Identification */}
          <div className="glass-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#10b981" />
              Commercial & Statutory Billing
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '0.875rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Registered Billing Address</div>
                <div style={{ whiteSpace: 'pre-line' }}>{client.billingAddress}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Payment Credit Terms</div>
                <div>{client.paymentTermsDays} Days from Invoice Date</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>GST State Jurisdiction</div>
                <div>State Code {client.stateCode}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLIENT SITES */}
      {activeTab === 'sites' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Physical operating depots, factories, hubs, or work sites serviced for this client.
            </p>
            {canUpdate && (
              <button
                onClick={() => setShowSiteModal(true)}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.8125rem' }}
              >
                <Plus size={15} />
                Add Site
              </button>
            )}
          </div>

          {client.sites?.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MapPin size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>No sites registered</div>
              <div style={{ fontSize: '0.8125rem', marginTop: '4px' }}>Add client sites or operational depots to assign deployments and site-specific billing rates.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
              {client.sites.map((site) => (
                <div key={site.id} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--primary-400)', fontWeight: 600 }}>
                        {site.siteCode}
                      </span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '2px 0 0 0' }}>{site.siteName}</h4>
                    </div>
                    <span className={`status-badge ${site.isActive ? 'status-active' : 'status-draft'}`} style={{ fontSize: '0.6875rem' }}>
                      {site.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    <div>{site.address}</div>
                    <div>{site.city} - {site.pincode} (State: {site.stateCode})</div>
                  </div>

                  {site.siteSupervisorName && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Supervisor: <strong style={{ color: 'var(--text-primary)' }}>{site.siteSupervisorName}</strong>
                      {site.siteSupervisorPhone && ` (${site.siteSupervisorPhone})`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CLIENT CONTRACTS */}
      {activeTab === 'contracts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Historical and active service agreements. Historical contract records remain intact in compliance with legal audit requirements.
            </p>
            {canUpdate && (
              <button
                onClick={() => setShowContractModal(true)}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.8125rem' }}
              >
                <Plus size={15} />
                New Contract
              </button>
            )}
          </div>

          {client.contracts?.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>No contracts recorded</div>
              <div style={{ fontSize: '0.8125rem', marginTop: '4px' }}>Register Master Service Agreements (MSA) or work orders.</div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contract No</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Title</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validity Period</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cycle</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notice</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {client.contracts.map((k) => (
                    <tr key={k.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                        {k.contractNumber}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.875rem', fontWeight: 500 }}>
                        {k.title}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {new Date(k.startDate).toLocaleDateString()} → {new Date(k.endDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.8125rem' }}>
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px' }}>
                          {k.billingCycle}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {k.noticePeriodDays} days
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`status-badge ${k.status === 'ACTIVE' ? 'status-active' : 'status-draft'}`}>
                          {k.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BILLING RATES & VERSIONING */}
      {activeTab === 'rates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                Effective-dated billing rate cards by designation and site. Rate revisions are atomic and preserve full historical audit trail.
              </p>
            </div>
            {canUpdate && (
              <button
                onClick={() => setShowRateModal(true)}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.8125rem' }}
              >
                <Plus size={15} />
                Add Rate Card
              </button>
            )}
          </div>

          {client.billingRates?.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <DollarSign size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>No billing rates defined</div>
              <div style={{ fontSize: '0.8125rem', marginTop: '4px' }}>Create rate cards for Heavy Vehicle Drivers, Security Guards, or Helpers to enable billing.</div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Designation</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Site Scope</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Billing Model</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base Rate</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OT Rate / Hr</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Effective Validity</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 18px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {client.billingRates.map((r) => {
                    const isCurrent = !r.effectiveTo || new Date(r.effectiveTo) >= new Date();
                    return (
                      <tr 
                        key={r.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-subtle)',
                          opacity: isCurrent ? 1 : 0.65,
                          background: isCurrent ? 'transparent' : 'rgba(0, 0, 0, 0.15)'
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {r.designation?.name || 'Designation'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {r.designation?.code}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.8125rem' }}>
                          {r.clientSite ? (
                            <span style={{ color: 'var(--primary-300)' }}>{r.clientSite.siteName}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>All Client Sites</span>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.8125rem' }}>
                          <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', padding: '3px 8px', borderRadius: '4px' }}>
                            {r.billingModel}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.9375rem', fontWeight: 700, color: '#34d399' }}>
                          ₹{Number(r.rateAmount).toLocaleString('en-IN')}
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          ₹{Number(r.otHourlyRate || 0).toLocaleString('en-IN')}
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                          <div>From: {new Date(r.effectiveFrom).toLocaleDateString()}</div>
                          <div style={{ color: r.effectiveTo ? 'var(--text-muted)' : '#34d399' }}>
                            To: {r.effectiveTo ? new Date(r.effectiveTo).toLocaleDateString() : 'Active (Open)'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span className={`status-badge ${isCurrent ? 'status-active' : 'status-draft'}`} style={{ fontSize: '0.6875rem' }}>
                            {isCurrent ? 'ACTIVE' : 'HISTORICAL'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          {canUpdate && isCurrent && (
                            <button
                              onClick={() => {
                                setSelectedRateForRevision(r);
                                setReviseForm({
                                  newRateAmount: String(r.rateAmount),
                                  newEffectiveFrom: '',
                                  newOtHourlyRate: String(r.otHourlyRate || '0'),
                                  newStandardShiftHours: String(r.standardShiftHours || '8'),
                                  reason: '',
                                });
                                setShowReviseModal(true);
                              }}
                              className="btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Revise Rate (Closes current rate and starts new rate)"
                            >
                              <RefreshCw size={13} />
                              Revise Version
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CLIENT SITE */}
      {/* ========================================================================= */}
      {showSiteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ maxWidth: '560px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Add New Client Site</h3>
              <button onClick={() => setShowSiteModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {actionError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '16px' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateSite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Site Code *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. SITE-AMB"
                    value={siteForm.siteCode}
                    onChange={(e) => setSiteForm({ ...siteForm, siteCode: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="input-label">Site / Depot Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Ambattur Logistics Hub"
                    value={siteForm.siteName}
                    onChange={(e) => setSiteForm({ ...siteForm, siteName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Site Physical Address *</label>
                <textarea
                  required
                  rows={2}
                  className="input-field"
                  placeholder="Plot / Warehouse address..."
                  value={siteForm.address}
                  onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">City *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Chennai"
                    value={siteForm.city}
                    onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">State Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    className="input-field"
                    placeholder="33"
                    value={siteForm.stateCode}
                    onChange={(e) => setSiteForm({ ...siteForm, stateCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="input-field"
                    placeholder="600058"
                    value={siteForm.pincode}
                    onChange={(e) => setSiteForm({ ...siteForm, pincode: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Site Supervisor Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="K. Balaji"
                    value={siteForm.siteSupervisorName}
                    onChange={(e) => setSiteForm({ ...siteForm, siteSupervisorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Supervisor Phone</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="9841234567"
                    value={siteForm.siteSupervisorPhone}
                    onChange={(e) => setSiteForm({ ...siteForm, siteSupervisorPhone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowSiteModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Saving...' : 'Add Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE CONTRACT */}
      {/* ========================================================================= */}
      {showContractModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ maxWidth: '560px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Register Client Contract</h3>
              <button onClick={() => setShowContractModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {actionError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '16px' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateContract} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Contract No *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="CNT-2026-01"
                    value={contractForm.contractNumber}
                    onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="input-label">Contract Title *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Master Logistics Agreement 2026"
                    value={contractForm.title}
                    onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Start Date *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">End Date *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Billing Cycle</label>
                  <select
                    className="input-field"
                    value={contractForm.billingCycle}
                    onChange={(e) => setContractForm({ ...contractForm, billingCycle: e.target.value })}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="FORTNIGHTLY">Fortnightly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Notice Period (Days)</label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={contractForm.noticePeriodDays}
                    onChange={(e) => setContractForm({ ...contractForm, noticePeriodDays: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowContractModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Saving...' : 'Register Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD BILLING RATE */}
      {/* ========================================================================= */}
      {showRateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ maxWidth: '580px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Add Rate Card</h3>
              <button onClick={() => setShowRateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {actionError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '16px' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateRate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Designation ID / Code *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter Designation UUID"
                    value={rateForm.designationId}
                    onChange={(e) => setRateForm({ ...rateForm, designationId: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>e.g. Heavy Vehicle Driver UUID</span>
                </div>

                <div>
                  <label className="input-label">Site Specificity</label>
                  <select
                    className="input-field"
                    value={rateForm.clientSiteId}
                    onChange={(e) => setRateForm({ ...rateForm, clientSiteId: e.target.value })}
                  >
                    <option value="">All Sites (Client-Wide)</option>
                    {client.sites?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteName} ({s.siteCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Billing Model *</label>
                  <select
                    className="input-field"
                    value={rateForm.billingModel}
                    onChange={(e) => setRateForm({ ...rateForm, billingModel: e.target.value })}
                  >
                    <option value="MONTHLY_FIXED">Monthly Fixed</option>
                    <option value="PER_EMPLOYEE">Per Employee</option>
                    <option value="PER_SHIFT">Per Shift</option>
                    <option value="HOURLY">Hourly</option>
                    <option value="OVERTIME">Overtime Only</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Base Rate Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="input-field"
                    placeholder="25000"
                    value={rateForm.rateAmount}
                    onChange={(e) => setRateForm({ ...rateForm, rateAmount: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Standard Shift Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    className="input-field"
                    value={rateForm.standardShiftHours}
                    onChange={(e) => setRateForm({ ...rateForm, standardShiftHours: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Overtime Rate / Hour (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="150"
                    value={rateForm.otHourlyRate}
                    onChange={(e) => setRateForm({ ...rateForm, otHourlyRate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Effective From *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={rateForm.effectiveFrom}
                    onChange={(e) => setRateForm({ ...rateForm, effectiveFrom: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Effective To (Leave empty for open)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={rateForm.effectiveTo}
                    onChange={(e) => setRateForm({ ...rateForm, effectiveTo: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowRateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Creating...' : 'Create Rate Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REVISE RATE VERSION (ATOMIC SUPERSEDING) */}
      {/* ========================================================================= */}
      {showReviseModal && selectedRateForRevision && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ maxWidth: '580px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Revise Rate Version: {selectedRateForRevision.designation?.name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Previous rate: ₹{selectedRateForRevision.rateAmount} ({selectedRateForRevision.billingModel}) from {new Date(selectedRateForRevision.effectiveFrom).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setShowReviseModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '0.8125rem',
              color: '#93c5fd',
              marginBottom: '16px',
              display: 'flex',
              gap: '8px',
            }}>
              <History size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Atomic Rate Versioning:</strong> Submitting this will automatically close the existing active rate on the day before the new effective date. Historical invoices and deployments will remain linked to previous rates.
              </div>
            </div>

            {actionError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '16px' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleReviseRate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">New Effective From Date *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={reviseForm.newEffectiveFrom}
                    onChange={(e) => setReviseForm({ ...reviseForm, newEffectiveFrom: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Must be after {new Date(selectedRateForRevision.effectiveFrom).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <label className="input-label">New Base Rate Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="input-field"
                    placeholder="28000"
                    value={reviseForm.newRateAmount}
                    onChange={(e) => setReviseForm({ ...reviseForm, newRateAmount: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">New OT Rate / Hr (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={reviseForm.newOtHourlyRate}
                    onChange={(e) => setReviseForm({ ...reviseForm, newOtHourlyRate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="input-label">Shift Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    className="input-field"
                    value={reviseForm.newStandardShiftHours}
                    onChange={(e) => setReviseForm({ ...reviseForm, newStandardShiftHours: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Reason for Revision (Audit Trail)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Annual DA increment or contract renegotiation"
                  value={reviseForm.reason}
                  onChange={(e) => setReviseForm({ ...reviseForm, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowReviseModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Processing Revision...' : 'Apply Rate Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
