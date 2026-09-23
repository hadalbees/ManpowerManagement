'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  replacementsApi,
  ReplacementRecord,
  ReplacementStatus,
} from '@/lib/replacements-api';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Check,
  X,
  Calendar,
  Building2,
  UserCheck,
  CheckSquare,
} from 'lucide-react';

export default function ReplacementsRequestsPage() {
  const [replacements, setReplacements] = useState<ReplacementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Action Modals State
  const [selectedRecord, setSelectedRecord] = useState<ReplacementRecord | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'CANCEL' | 'COMPLETE' | 'ATTENDANCE' | null>(null);
  const [actionComments, setActionComments] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = { limit: 100 };
      if (statusFilter !== 'ALL') {
        filters.status = statusFilter as ReplacementStatus;
      }
      const res = await replacementsApi.getAll(filters);
      if (res.success && res.data) {
        setReplacements(res.data.items || []);
      } else {
        setError(res.error?.message || 'Failed to load replacements');
      }
    } catch {
      setError('An unexpected error occurred while fetching replacements');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async () => {
    if (!selectedRecord || !actionType) return;
    setActionLoading(true);
    setActionError(null);

    try {
      let res;
      if (actionType === 'APPROVE') {
        res = await replacementsApi.approve(selectedRecord.id, { comments: actionComments });
      } else if (actionType === 'REJECT') {
        if (!actionComments.trim()) {
          setActionError('Rejection reason is mandatory');
          setActionLoading(false);
          return;
        }
        res = await replacementsApi.reject(selectedRecord.id, { rejectionReason: actionComments });
      } else if (actionType === 'CANCEL') {
        res = await replacementsApi.cancel(selectedRecord.id, { cancellationReason: actionComments });
      } else if (actionType === 'COMPLETE') {
        res = await replacementsApi.complete(selectedRecord.id, { notes: actionComments });
      } else if (actionType === 'ATTENDANCE') {
        res = await replacementsApi.recordAttendance(selectedRecord.id, {
          shiftBusinessDate: attendanceDate,
          workedHours: 8.0,
          supervisorRemarks: actionComments || undefined,
        });
      }

      if (res?.success) {
        setSelectedRecord(null);
        setActionType(null);
        setActionComments('');
        loadData();
      } else {
        setActionError(res?.error?.message || 'Operation failed');
      }
    } catch (err: any) {
      setActionError(err.message || 'An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredItems = replacements.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const absent = `${r.absentEmployee?.firstName} ${r.absentEmployee?.lastName} ${r.absentEmployee?.employeeCode}`.toLowerCase();
    const rep = `${r.replacementEmployee?.firstName} ${r.replacementEmployee?.lastName} ${r.replacementEmployee?.employeeCode}`.toLowerCase();
    const client = `${r.originalDeployment?.client?.companyName} ${r.originalDeployment?.clientSite?.siteName}`.toLowerCase();
    return absent.includes(term) || rep.includes(term) || client.includes(term);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISPATCHED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <Clock size={12} /> Dispatched
          </span>
        );
      case 'COMPLETED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <XCircle size={12} /> Cancelled
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <DashboardLayout
      title="Replacement Dispatches & Requests"
      subtitle="Operational log of shift replacements, eligibility tracking, and attendance integration"
      action={
        <Link
          href="/dashboard/replacements/new"
          className="btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--primary-600)',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.875rem',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          }}
        >
          <Plus size={16} /> Dispatch Replacement
        </Link>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Filter & Search Bar */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'DISPATCHED', 'COMPLETED', 'CANCELLED'].map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: active ? 'var(--primary-600)' : 'rgba(255, 255, 255, 0.05)',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    border: active ? '1px solid var(--primary-500)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search worker, client, site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Main Table */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Loading replacement assignments...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              No replacement records matching filter
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.2)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 600 }}>Client & Site</th>
                    <th style={{ padding: '14px 16px', fontWeight: 600 }}>Absent Worker</th>
                    <th style={{ padding: '14px 16px', fontWeight: 600 }}>Replacement Worker</th>
                    <th style={{ padding: '14px 16px', fontWeight: 600 }}>Date Range</th>
                    <th style={{ padding: '14px 16px', fontWeight: 600 }}>Designation</th>
                    <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((rep) => (
                    <tr
                      key={rep.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>
                          {rep.originalDeployment?.client?.companyName || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {rep.originalDeployment?.clientSite?.siteName || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#f87171' }}>
                          {rep.absentEmployee?.firstName} {rep.absentEmployee?.lastName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {rep.absentEmployee?.employeeCode}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#34d399' }}>
                          {rep.replacementEmployee?.firstName} {rep.replacementEmployee?.lastName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {rep.replacementEmployee?.employeeCode}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#ffffff' }}>
                          {new Date(rep.startDate).toISOString().slice(0, 10)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          to {new Date(rep.endDate).toISOString().slice(0, 10)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {rep.originalDeployment?.designation?.title || 'Security/Staff'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {getStatusBadge(rep.status)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <Link
                            href={`/dashboard/replacements/requests/${rep.id}`}
                            title="View Details"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Eye size={14} />
                          </Link>

                          {rep.status === 'DISPATCHED' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRecord(rep);
                                  setActionType('ATTENDANCE');
                                  setActionComments('');
                                }}
                                title="Record Attendance Shift"
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#60a5fa',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <CheckSquare size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRecord(rep);
                                  setActionType('COMPLETE');
                                  setActionComments('');
                                }}
                                title="Complete Replacement"
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#34d399',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRecord(rep);
                                  setActionType('CANCEL');
                                  setActionComments('');
                                }}
                                title="Cancel Replacement"
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#f87171',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Modal */}
        {selectedRecord && actionType && (
          <div
            style={{
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
              zIndex: 1000,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '24px',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>
                {actionType === 'ATTENDANCE' && 'Record Replacement Shift Attendance'}
                {actionType === 'COMPLETE' && 'Complete Replacement Assignment'}
                {actionType === 'CANCEL' && 'Cancel Replacement Assignment'}
                {actionType === 'REJECT' && 'Reject Replacement'}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                Assignment: {selectedRecord.replacementEmployee?.firstName} replacing{' '}
                {selectedRecord.absentEmployee?.firstName} at{' '}
                {selectedRecord.originalDeployment?.client?.companyName}
              </p>

              {actionError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.8125rem',
                    marginBottom: '14px',
                  }}
                >
                  {actionError}
                </div>
              )}

              {actionType === 'ATTENDANCE' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Shift Business Date:
                  </label>
                  <input
                    type="date"
                    value={attendanceDate}
                    min={new Date(selectedRecord.startDate).toISOString().slice(0, 10)}
                    max={new Date(selectedRecord.endDate).toISOString().slice(0, 10)}
                    onChange={(e) => setAttendanceDate(e.target.value)}
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Must be within replacement window ({new Date(selectedRecord.startDate).toISOString().slice(0, 10)} to {new Date(selectedRecord.endDate).toISOString().slice(0, 10)})
                  </span>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  {actionType === 'CANCEL' ? 'Cancellation Reason' : actionType === 'REJECT' ? 'Rejection Reason (Required)' : 'Notes / Remarks (Optional)'}:
                </label>
                <textarea
                  rows={3}
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  placeholder="Enter comments or operational reason..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRecord(null);
                    setActionType(null);
                  }}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background:
                      actionType === 'CANCEL' || actionType === 'REJECT'
                        ? 'var(--danger-600, #dc2626)'
                        : 'var(--primary-600)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
