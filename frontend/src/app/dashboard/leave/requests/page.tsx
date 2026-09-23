'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { leaveApi, LeaveRequest, LeaveType, LeaveStatus } from '@/lib/leave-api';
import { employeesApi, EmployeeItem } from '@/lib/employees-api';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  Plus,
  AlertCircle,
  Check,
  X,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Action Modals
  const [approveModalReq, setApproveModalReq] = useState<LeaveRequest | null>(null);
  const [approveComments, setApproveComments] = useState('');
  const [rejectModalReq, setRejectModalReq] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: any = { limit: 100 };
      if (selectedStatus !== 'ALL') query.status = selectedStatus as LeaveStatus;
      if (selectedLeaveType !== 'ALL') query.leaveTypeId = selectedLeaveType;
      if (selectedEmployee !== 'ALL') query.employeeId = selectedEmployee;
      if (startDate) query.startDate = startDate;
      if (endDate) query.endDate = endDate;

      const [reqRes, typeRes, empRes] = await Promise.all([
        leaveApi.getLeaveRequests(query),
        leaveApi.getLeaveTypes(),
        employeesApi.getEmployees({ limit: 100 }),
      ]);

      if (reqRes.success && reqRes.data) {
        setRequests(reqRes.data.items || []);
      } else {
        setError(reqRes.error?.message || 'Failed to fetch leave requests');
      }

      if (typeRes.success && typeRes.data) {
        setLeaveTypes(typeRes.data);
      }

      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items || []);
      }
    } catch {
      setError('An unexpected error occurred while loading requests');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedLeaveType, selectedEmployee, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async () => {
    if (!approveModalReq) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await leaveApi.approveLeaveRequest(approveModalReq.id, {
        reviewerComments: approveComments || 'Approved',
      });
      if (res.success) {
        setSuccessMsg(`Leave request for ${approveModalReq.employee?.firstName} approved successfully!`);
        setApproveModalReq(null);
        setApproveComments('');
        loadData();
      } else {
        setError(res.error?.message || 'Approval failed');
      }
    } catch {
      setError('An error occurred while approving request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModalReq) return;
    if (!rejectReason.trim()) {
      setError('Rejection reason is mandatory');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await leaveApi.rejectLeaveRequest(rejectModalReq.id, {
        rejectionReason: rejectReason,
      });
      if (res.success) {
        setSuccessMsg(`Leave request rejected.`);
        setRejectModalReq(null);
        setRejectReason('');
        loadData();
      } else {
        setError(res.error?.message || 'Rejection failed');
      }
    } catch {
      setError('An error occurred while rejecting request');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'PENDING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Clock size={12} /> Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(244, 63, 94, 0.15)', color: '#f87171', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.3)' }}>
            {status}
          </span>
        );
    }
  };

  return (
    <DashboardLayout
      title="Leave Requests"
      subtitle="Comprehensive list of all submitted applications, approvals, rejections, and attendance impact"
      action={
        <Link
          href="/dashboard/leave/new"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 700,
            textDecoration: 'none',
            color: '#ffffff',
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
            boxShadow: '0 4px 14px var(--primary-glow)',
          }}
        >
          <Plus size={16} /> New Application
        </Link>
      }
    >
      {/* Alert Messages */}
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

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' }}>
          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Leave Type Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Leave Type</label>
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            >
              <option value="ALL">All Types</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            >
              <option value="ALL">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            />
          </div>

          {/* End Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading requests...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests found matching filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>From</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>To</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Days</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reviewed By</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {req.employee?.firstName} {req.employee?.lastName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {req.employee?.employeeCode} • {req.employee?.branch?.branchName || 'HQ'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 14px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: req.leaveType?.isPaid ? 'rgba(59, 130, 246, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: req.leaveType?.isPaid ? '#60a5fa' : '#f87171' }}>
                        {req.leaveType?.code || 'LEAVE'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 14px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{req.startDate}</td>
                    <td style={{ padding: '14px 14px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{req.endDate}</td>
                    <td style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>{Number(req.totalDays)}d</td>
                    <td style={{ padding: '14px 14px' }}>{getStatusBadge(req.status)}</td>
                    <td style={{ padding: '14px 14px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {req.reviewedBy?.fullName || '—'}
                    </td>
                    <td style={{ padding: '14px 14px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => setApproveModalReq(req)}
                              title="Approve Request"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                cursor: 'pointer',
                              }}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectModalReq(req)}
                              title="Reject Request"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(244, 63, 94, 0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </>
                        )}
                        <Link
                          href={`/dashboard/leave/requests/${req.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--primary-400)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            textDecoration: 'none',
                          }}
                        >
                          View <ChevronRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveModalReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Approve Leave Request
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Approving {Number(approveModalReq.totalDays)} days of {approveModalReq.leaveType?.name} for{' '}
              <strong>{approveModalReq.employee?.firstName} {approveModalReq.employee?.lastName}</strong> ({approveModalReq.startDate} to {approveModalReq.endDate}).
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Reviewer Comments (Optional)</label>
              <textarea
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                placeholder="e.g., Approved as per shift schedule"
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setApproveModalReq(null)}
                disabled={actionLoading}
                style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                style={{ padding: '10px 20px', borderRadius: '8px', background: '#10b981', color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f43f5e', marginBottom: '8px' }}>
              Reject Leave Request
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Please provide the official reason for rejecting this leave request.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Rejection Reason <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Shortage of deployed drivers at client warehouse"
                rows={3}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setRejectModalReq(null)}
                disabled={actionLoading}
                style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                style={{ padding: '10px 20px', borderRadius: '8px', background: '#f43f5e', color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                {actionLoading ? 'Rejecting...' : 'Reject Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
