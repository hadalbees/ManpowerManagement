'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  fetchAttendanceRecords,
  recordAttendance,
  approveAttendance,
  AttendanceRecord,
  AttendanceStatus,
} from '@/lib/attendance-api';
import { employeesApi, EmployeeItem } from '@/lib/employees-api';
import { clientsApi, ClientItem } from '@/lib/clients-api';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Lock,
  Calendar,
  X,
  Building,
  Check,
} from 'lucide-react';
import { PageHeader, StatCard, StatusBadge, DataTable, Column } from '@/components/ui';

export default function AttendanceDashboardPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedApproval, setSelectedApproval] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown options
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    shiftBusinessDate: today,
    clockInTime: '',
    clockOutTime: '',
    status: 'PRESENT' as AttendanceStatus,
    scheduledHours: 8,
    workedHours: 8,
    overtimeHours: 0,
    supervisorRemarks: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: any = {
        limit: 100,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      if (selectedStatus !== 'ALL') query.status = selectedStatus;
      if (selectedApproval === 'APPROVED') query.isApproved = true;
      if (selectedApproval === 'PENDING') query.isApproved = false;

      const [attRes, empRes, cliRes] = await Promise.all([
        fetchAttendanceRecords(query),
        employeesApi.getEmployees({ limit: 100 }),
        clientsApi.getClients({ limit: 100 }),
      ]);

      if (attRes.success && attRes.data) {
        setRecords(attRes.data.items || []);
      } else {
        setError(attRes.error?.message || 'Failed to load attendance records');
      }

      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items || []);
      }
      if (cliRes.success && cliRes.data) {
        setClients(cliRes.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching operational muster');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedStatus, selectedApproval]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      setError('Please select an employee.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await recordAttendance({
        ...formData,
        scheduledHours: Number(formData.scheduledHours),
        workedHours: Number(formData.workedHours),
        overtimeHours: Number(formData.overtimeHours),
      });

      if (res.success) {
        setSuccessMessage('Attendance recorded successfully.');
        setIsRecordModalOpen(false);
        setFormData({
          employeeId: '',
          shiftBusinessDate: today,
          clockInTime: '',
          clockOutTime: '',
          status: 'PRESENT',
          scheduledHours: 8,
          workedHours: 8,
          overtimeHours: 0,
          supervisorRemarks: '',
        });
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(res.error?.message || 'Failed to record attendance');
      }
    } catch (err: any) {
      setError(err.message || 'System error submitting attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickApprove = async (id: string) => {
    try {
      const res = await approveAttendance(id, {
        isApproved: true,
        supervisorRemarks: 'Verified by operational supervisor',
      });
      if (res.success) {
        setSuccessMessage('Shift attendance approved successfully.');
        loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error?.message || 'Approval rejection returned');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing supervisor verification');
    }
  };

  // Filter in memory for instantaneous search term filtering
  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const empName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
    const empCode = (r.employee?.employeeCode || '').toLowerCase();
    const clientName = (r.client?.companyName || '').toLowerCase();
    return empName.includes(term) || empCode.includes(term) || clientName.includes(term);
  });

  // Calculate Operational Metrics
  const totalRecorded = records.length;
  const presentCount = records.filter((r) => r.status === 'PRESENT' || r.status === 'HALF_DAY').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const totalOvertime = records.reduce((acc, r) => acc + (Number(r.overtimeHours) || 0), 0);
  const pendingApprovalCount = records.filter((r) => !r.isApproved).length;

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Shift Date',
      render: (r) => {
        const dateFormatted = new Date(r.shiftBusinessDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {r.isLocked && (
                <span title="Locked by finalized payroll batch">
                  <Lock size={13} style={{ color: 'var(--accent-amber-text)' }} />
                </span>
              )}
              <span>{dateFormatted}</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {r.deployment?.isNightShift ? '🌙 Night Shift' : '☀️ Day Shift'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'employee',
      header: 'Employee',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {r.employee?.firstName} {r.employee?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            {r.employee?.employeeCode}
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client & Operating Site',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
            {r.client?.companyName || 'Corporate Client'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {r.clientSite?.siteName} ({r.deployment?.designation?.name || 'Assigned Staff'})
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'hours',
      header: 'Worked / OT',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {r.workedHours} hrs
          </div>
          {Number(r.overtimeHours) > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber-text)', fontWeight: 600 }}>
              +{r.overtimeHours} hrs OT
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'verification',
      header: 'Verification',
      render: (r) =>
        r.isApproved ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-emerald-text)', fontSize: '0.78rem', fontWeight: 600 }}>
            <ShieldCheck size={14} /> Approved
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            <Clock size={14} /> Pending
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => {
        if (!r.isApproved && !r.isLocked) {
          return (
            <button
              onClick={() => handleQuickApprove(r.id)}
              className="btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                color: 'var(--accent-emerald-text)',
                borderColor: 'var(--accent-emerald-border)',
                background: 'var(--accent-emerald-bg)',
              }}
            >
              <Check size={13} /> Verify
            </button>
          );
        }
        return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>;
      },
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Attendance & Operational Muster"
        subtitle="Daily shift muster, clock times, overtime validation, supervisor verifications, and payroll locks"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Attendance' },
        ]}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/dashboard/attendance/daily" className="btn-secondary">
              <Calendar size={15} /> Daily Muster Grid
            </Link>
            <button onClick={() => setIsRecordModalOpen(true)} className="btn-primary">
              <Plus size={15} /> Record Shift
            </button>
          </div>
        }
      />

      {/* Alerts */}
      {successMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-emerald-bg)',
            border: '1px solid var(--accent-emerald-border)',
            color: 'var(--accent-emerald-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.84rem',
            marginBottom: '16px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-rose-bg)',
            border: '1px solid var(--accent-rose-border)',
            color: 'var(--accent-rose-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.84rem',
            marginBottom: '16px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Operational Metric KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <StatCard
          title="Total Shifts Logged"
          value={totalRecorded}
          icon={Calendar}
          subtext="Filtered window"
          accentColor="#2563eb"
        />

        <StatCard
          title="Present & Active"
          value={presentCount}
          icon={CheckCircle2}
          subtext="Full & partial shifts"
          accentColor="#10b981"
        />

        <StatCard
          title="Reported Absences"
          value={absentCount}
          icon={AlertCircle}
          subtext="Unmarked or absent"
          accentColor="#ef4444"
        />

        <StatCard
          title="Overtime Hours"
          value={`${totalOvertime.toFixed(1)} hrs`}
          icon={Clock}
          subtext="Payable overtime"
          accentColor="#f59e0b"
        />

        <StatCard
          title="Pending Verification"
          value={pendingApprovalCount}
          icon={ShieldCheck}
          subtext="Requires sign-off"
          accentColor="#8b5cf6"
        />
      </div>

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search personnel or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ width: '100%', paddingLeft: '34px', height: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
              style={{ height: '36px', padding: '6px 10px' }}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
              style={{ height: '36px', padding: '6px 10px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input"
            style={{ width: '130px', height: '36px', padding: '6px 10px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="HOLIDAY">Holiday</option>
          </select>

          <select
            value={selectedApproval}
            onChange={(e) => setSelectedApproval(e.target.value)}
            className="input"
            style={{ width: '150px', height: '36px', padding: '6px 10px' }}
          >
            <option value="ALL">All Verifications</option>
            <option value="APPROVED">Approved Only</option>
            <option value="PENDING">Pending Approval</option>
          </select>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        columns={columns}
        data={filteredRecords}
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyTitle="No Attendance Records"
        emptyDescription="No muster records found for this period. Try changing your date range or log a new shift."
        emptyAction={
          <button onClick={() => setIsRecordModalOpen(true)} className="btn-primary">
            <Plus size={15} /> Record Shift
          </button>
        }
      />

      {/* Record Shift Modal */}
      {isRecordModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(2px)',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setIsRecordModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarCheck size={18} style={{ color: 'var(--accent-blue)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Log Shift Attendance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Personnel *
                </label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="input"
                  style={{ width: '100%', height: '38px' }}
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Shift Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.shiftBusinessDate}
                    onChange={(e) => setFormData({ ...formData, shiftBusinessDate: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AttendanceStatus })}
                    className="input"
                    style={{ width: '100%', height: '38px' }}
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="HALF_DAY">HALF DAY</option>
                    <option value="ABSENT">ABSENT</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                    <option value="HOLIDAY">HOLIDAY</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Worked Hours *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.workedHours}
                    onChange={(e) => setFormData({ ...formData, workedHours: Number(e.target.value) })}
                    className="input"
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="12"
                    value={formData.overtimeHours}
                    onChange={(e) => setFormData({ ...formData, overtimeHours: Number(e.target.value) })}
                    className="input"
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Supervisor Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved overtime shift coverage"
                  value={formData.supervisorRemarks}
                  onChange={(e) => setFormData({ ...formData, supervisorRemarks: e.target.value })}
                  className="input"
                  style={{ width: '100%', height: '38px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  disabled={submitting}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Recording...' : 'Submit Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
