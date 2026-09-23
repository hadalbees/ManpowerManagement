'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  replacementsApi,
  ReplacementRecord,
} from '@/lib/replacements-api';
import {
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Calendar,
  Truck,
  ShieldCheck,
  AlertCircle,
  User,
  CheckSquare,
  FileText,
} from 'lucide-react';

export default function ReplacementDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [replacement, setReplacement] = useState<ReplacementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attendance Form
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attHours, setAttHours] = useState(8.0);
  const [attRemarks, setAttRemarks] = useState('');
  const [attSubmitting, setAttSubmitting] = useState(false);
  const [attSuccess, setAttSuccess] = useState<string | null>(null);
  const [attError, setAttError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await replacementsApi.getById(id);
      if (res.success && res.data) {
        setReplacement(res.data);
      } else {
        setError(res.error?.message || 'Replacement assignment not found');
      }
    } catch {
      setError('An unexpected error occurred while fetching replacement details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacement) return;
    setAttSubmitting(true);
    setAttError(null);
    setAttSuccess(null);

    try {
      const res = await replacementsApi.recordAttendance(replacement.id, {
        shiftBusinessDate: attDate,
        workedHours: Number(attHours),
        supervisorRemarks: attRemarks || undefined,
      });

      if (res.success) {
        setAttSuccess(`Successfully recorded attendance for shift date ${attDate}`);
        setAttRemarks('');
      } else {
        setAttError(res.error?.message || 'Failed to record attendance');
      }
    } catch (err: any) {
      setAttError(err.message || 'Error occurred');
    } finally {
      setAttSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISPATCHED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <Clock size={14} /> Dispatched (Active Shift)
          </span>
        );
      case 'COMPLETED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckCircle2 size={14} /> Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <XCircle size={14} /> Cancelled
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Replacement Details">
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
          Loading replacement record...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !replacement) {
    return (
      <DashboardLayout title="Replacement Details">
        <div
          style={{
            padding: '24px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={20} />
          {error || 'Record not found'}
        </div>
        <Link
          href="/dashboard/replacements/requests"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '16px',
            color: 'var(--primary-400)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Requests
        </Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Replacement Ref #${replacement.id.slice(0, 8)}`}
      subtitle={`Scheduled ${new Date(replacement.startDate).toISOString().slice(0, 10)} to ${new Date(replacement.endDate).toISOString().slice(0, 10)}`}
      action={
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            href="/dashboard/replacements/requests"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            <ArrowLeft size={16} /> Back
          </Link>
          {getStatusBadge(replacement.status)}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* INVARIANT HIGHLIGHT BANNER */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(99, 102, 241, 0.08))',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#ffffff' }}>
              Operational Overlay Architecture
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Original deployment #{replacement.originalDeploymentId.slice(0, 8)} retains permanent owner (
              {replacement.absentEmployee?.employeeCode}). Shift attendance recorded here is tied to replacement worker{' '}
              {replacement.replacementEmployee?.employeeCode} while preserving client billing context.
            </div>
          </div>
        </div>

        {/* Worker Comparison Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Absent Worker Card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={16} />
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                ORIGINAL ABSENT EMPLOYEE
              </span>
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              {replacement.absentEmployee?.firstName} {replacement.absentEmployee?.lastName}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Employee Code:</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{replacement.absentEmployee?.employeeCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Branch:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{replacement.absentEmployee?.branch?.branchName || 'HQ'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Designation:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{replacement.absentEmployee?.primaryDesignation?.title || 'Security Guard'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reason for Absence:</span>
                <span style={{ color: '#fca5a5', fontWeight: 600 }}>{replacement.reason || 'Medical / Emergency Leave'}</span>
              </div>
            </div>
          </div>

          {/* Replacement Worker Card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCheck size={16} />
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                DISPATCHED REPLACEMENT EMPLOYEE
              </span>
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              {replacement.replacementEmployee?.firstName} {replacement.replacementEmployee?.lastName}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Employee Code:</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{replacement.replacementEmployee?.employeeCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Branch:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{replacement.replacementEmployee?.branch?.branchName || 'HQ'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Driving License:</span>
                <span style={{ color: replacement.replacementEmployee?.drivingLicenseNumber ? '#34d399' : 'var(--text-muted)' }}>
                  {replacement.replacementEmployee?.drivingLicenseNumber || 'None / Not Required'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Dispatched By:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{replacement.dispatchedBy?.fullName || 'Operations Coordinator'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Client & Deployment Details */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 16px 0' }}>
            Client Site & Deployment Assignment
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              fontSize: '0.875rem',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Client Company</div>
              <div style={{ fontWeight: 600, color: '#ffffff' }}>{replacement.originalDeployment?.client?.companyName}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Assigned Site</div>
              <div style={{ fontWeight: 600, color: '#ffffff' }}>{replacement.originalDeployment?.clientSite?.siteName}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Shift Window</div>
              <div style={{ fontWeight: 600, color: '#ffffff' }}>{replacement.originalDeployment?.shiftName || 'General Morning'}</div>
            </div>
            {replacement.originalDeployment?.vehicle && (
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Assigned Vehicle</div>
                <div style={{ fontWeight: 600, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={14} /> {replacement.originalDeployment.vehicle.registrationNumber}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shift Attendance Recording Form (for active dispatches) */}
        {replacement.status === 'DISPATCHED' && (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <CheckSquare size={18} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Record Replacement Shift Attendance
              </h3>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Log on-site presence for {replacement.replacementEmployee?.firstName} covering this deployment.
              Valid date range: {new Date(replacement.startDate).toISOString().slice(0, 10)} to {new Date(replacement.endDate).toISOString().slice(0, 10)}.
            </p>

            {attSuccess && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '0.875rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} /> {attSuccess}
              </div>
            )}

            {attError && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} /> {attError}
              </div>
            )}

            <form onSubmit={handleRecordAttendance} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Shift Business Date:
                </label>
                <input
                  type="date"
                  required
                  value={attDate}
                  min={new Date(replacement.startDate).toISOString().slice(0, 10)}
                  max={new Date(replacement.endDate).toISOString().slice(0, 10)}
                  onChange={(e) => setAttDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Worked Hours:
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  value={attHours}
                  onChange={(e) => setAttHours(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Supervisor Remarks:
                </label>
                <input
                  type="text"
                  value={attRemarks}
                  placeholder="e.g. Covered post #3 with zero discrepancies"
                  onChange={(e) => setAttRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={attSubmitting}
                  style={{
                    background: 'var(--primary-600)',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {attSubmitting ? 'Logging...' : 'Confirm Shift Attendance'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
