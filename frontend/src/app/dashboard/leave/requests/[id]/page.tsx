'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { leaveApi, LeaveRequest } from '@/lib/leave-api';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building,
  AlertCircle,
  ArrowLeft,
  Check,
  X,
  Ban,
  ShieldCheck,
  Calendar,
  FileText,
} from 'lucide-react';

export default function LeaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal actions
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approveComments, setApproveComments] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRequest = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await leaveApi.getLeaveRequestById(id);
      if (res.success && res.data) {
        setRequest(res.data);
      } else {
        setError(res.error?.message || 'Failed to load leave request');
      }
    } catch {
      setError('An unexpected error occurred while fetching request details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const handleApprove = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await leaveApi.approveLeaveRequest(id, {
        reviewerComments: approveComments || 'Approved by Manager',
      });
      if (res.success) {
        setSuccessMsg('Leave request approved successfully!');
        setIsApproveOpen(false);
        loadRequest();
      } else {
        setError(res.error?.message || 'Approval failed');
      }
    } catch {
      setError('An error occurred during approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is mandatory');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await leaveApi.rejectLeaveRequest(id, {
        rejectionReason: rejectReason,
      });
      if (res.success) {
        setSuccessMsg('Leave request rejected.');
        setIsRejectOpen(false);
        loadRequest();
      } else {
        setError(res.error?.message || 'Rejection failed');
      }
    } catch {
      setError('An error occurred during rejection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await leaveApi.cancelLeaveRequest(id, {
        cancellationReason: cancelReason || 'Cancelled by user',
      });
      if (res.success) {
        setSuccessMsg('Leave request cancelled successfully. Any consumed balance has been restored.');
        setIsCancelOpen(false);
        loadRequest();
      } else {
        setError(res.error?.message || 'Cancellation failed');
      }
    } catch {
      setError('An error occurred during cancellation');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle2 size={14} /> APPROVED
          </span>
        );
      case 'PENDING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Clock size={14} /> PENDING REVIEW
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 700, background: 'rgba(244, 63, 94, 0.15)', color: '#f87171', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            <XCircle size={14} /> REJECTED
          </span>
        );
      case 'CANCELLED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 700, background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.3)' }}>
            <Ban size={14} /> CANCELLED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      title={`Leave Request #${id?.slice(0, 8)}`}
      subtitle="Detailed application audit trail, approval metadata, and automated attendance resolution"
      action={
        <Link
          href="/dashboard/leave/requests"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
          }}
        >
          <ArrowLeft size={16} /> Back to Requests
        </Link>
      }
    >
      {/* Notifications */}
      {error && (
        <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div style={{ marginBottom: '20px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} /> <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading details...</div>
      ) : !request ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Request not found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Main Request Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Card */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 800,
                        background: request.leaveType?.isPaid ? 'rgba(59, 130, 246, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                        color: request.leaveType?.isPaid ? '#60a5fa' : '#f87171',
                      }}
                    >
                      {request.leaveType?.name} ({request.leaveType?.code})
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {request.leaveType?.isPaid ? 'Paid Leave' : 'Loss of Pay (Unpaid)'}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {request.startDate} to {request.endDate}
                  </h2>
                </div>
                <div>{getStatusBadge(request.status)}</div>
              </div>

              {/* Grid of Key Facts */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Calculated Days</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-400)' }}>
                    {Number(request.totalDays)} day(s)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employee Code</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {request.employee?.employeeCode}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Branch Office</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {request.employee?.branch?.branchName || 'Headquarters'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Application Date</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Reason for Leave
                </h4>
                <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {request.reason}
                </div>
              </div>
            </div>

            {/* Attendance Integration Impact */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <ShieldCheck size={20} color="#34d399" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Attendance Engine Resolution
                </h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                When approved, the leave engine resolves historical employee deployment on each shift date and records:
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600 }}>Shift Business Status</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#60a5fa' }}>
                    {request.leaveType?.isPaid ? 'PAID_LEAVE' : 'UNPAID_LEAVE'}
                  </div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 600 }}>Worked & Overtime Hours</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>
                    0.00h (Zero Worked)
                  </div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>Payroll Lock Guard</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#818cf8' }}>
                    Strict (Cannot Alter Locked)
                  </div>
                </div>
              </div>
            </div>

            {/* Reviewer / Decision History */}
            {request.status !== 'PENDING' && (
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                  Review & Decision Audit
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Action Taken By</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {request.reviewedBy?.fullName || 'Authorized Approver'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Action Timestamp</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '—'}
                    </div>
                  </div>
                </div>
                {request.reviewerComments && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Comments / Reason</div>
                    <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {request.reviewerComments}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Employee Profile Quick Card */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Employee Information
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={22} color="#60a5fa" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {request.employee?.firstName} {request.employee?.lastName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {request.employee?.employeeCode}
                  </div>
                </div>
              </div>
              <Link
                href={`/dashboard/employees/${request.employeeId}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                View Full Employee Profile
              </Link>
            </div>

            {/* Actions Card */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Manage Request
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {request.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => setIsApproveOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      <Check size={16} /> Approve Leave
                    </button>
                    <button
                      onClick={() => setIsRejectOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'rgba(244, 63, 94, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      <X size={16} /> Reject Leave
                    </button>
                  </>
                )}

                {(request.status === 'PENDING' || request.status === 'APPROVED') && (
                  <button
                    onClick={() => setIsCancelOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(107, 114, 128, 0.15)',
                      color: '#9ca3af',
                      border: '1px solid var(--border-medium)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    <Ban size={16} /> Cancel Leave
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {isApproveOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Approve Leave</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Confirm approval of {Number(request?.totalDays)} days from {request?.startDate} to {request?.endDate}.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Approval Comments</label>
              <textarea
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                placeholder="Optional comments"
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsApproveOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '8px' }}>Cancel</button>
              <button onClick={handleApprove} disabled={submitting} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, borderRadius: '8px' }}>{submitting ? 'Approving...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f43f5e', marginBottom: '8px' }}>Reject Leave</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Rejection Reason (Required)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify the operational reason..."
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsRejectOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '8px' }}>Cancel</button>
              <button onClick={handleReject} disabled={submitting || !rejectReason.trim()} style={{ padding: '10px 20px', background: '#f43f5e', color: '#fff', border: 'none', fontWeight: 700, borderRadius: '8px' }}>{submitting ? 'Rejecting...' : 'Confirm Rejection'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {isCancelOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Cancel Leave</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Are you sure you want to cancel this leave request? If approved, any consumed balance will be automatically restored.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Cancellation Reason</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsCancelOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '8px' }}>Dismiss</button>
              <button onClick={handleCancel} disabled={submitting} style={{ padding: '10px 20px', background: 'var(--primary-600)', color: '#fff', border: 'none', fontWeight: 700, borderRadius: '8px' }}>{submitting ? 'Cancelling...' : 'Confirm Cancellation'}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
