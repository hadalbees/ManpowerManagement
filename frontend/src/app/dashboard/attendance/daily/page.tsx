'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  fetchDailyMusterRoll,
  bulkRecordAttendance,
  recordAttendance,
  DailyMusterRollResponse,
  MusterRollItem,
  AttendanceStatus,
} from '@/lib/attendance-api';
import { clientsApi, ClientItem, ClientSiteItem } from '@/lib/clients-api';
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Building,
  MapPin,
  Clock,
  Truck,
  Check,
  X,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

export default function DailyMusterRollPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [sites, setSites] = useState<ClientSiteItem[]>([]);
  const [musterData, setMusterData] = useState<DailyMusterRollResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Local state for pending marks: deploymentId -> { status, workedHours, overtimeHours }
  const [pendingMarks, setPendingMarks] = useState<
    Record<string, { status: AttendanceStatus; workedHours: number; overtimeHours: number }>
  >({});

  // Load clients
  useEffect(() => {
    async function loadClients() {
      try {
        const res = await clientsApi.getClients({ limit: 100 });
        if (res.success && res.data) {
          const clientList = res.data.items || [];
          setClients(clientList);
          if (clientList.length > 0) {
            setSelectedClientId(clientList[0].id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load clients', err);
      }
    }
    loadClients();
  }, []);

  // When selectedClientId changes, load sites
  useEffect(() => {
    async function loadSites() {
      if (!selectedClientId) {
        setSites([]);
        setSelectedSiteId('');
        return;
      }
      try {
        const res = await clientsApi.getSites(selectedClientId);
        if (res.success && res.data) {
          setSites(res.data);
          if (res.data.length > 0) {
            setSelectedSiteId(res.data[0].id);
          } else {
            setSelectedSiteId('');
          }
        }
      } catch (err: any) {
        console.error('Failed to load sites', err);
        setSites([]);
        setSelectedSiteId('');
      }
    }
    loadSites();
  }, [selectedClientId]);

  // Load Muster Roll
  const loadMuster = useCallback(async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDailyMusterRoll(selectedSiteId, selectedDate);
      if (res.success && res.data) {
        setMusterData(res.data);
        setPendingMarks({});
      } else {
        setError(res.error?.message || 'Failed to load muster roll');
        setMusterData(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching muster roll');
      setMusterData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId, selectedDate]);

  useEffect(() => {
    if (selectedSiteId) {
      loadMuster();
    }
  }, [loadMuster, selectedSiteId, selectedDate]);

  // Set pending mark
  const handleSetStatus = (
    item: MusterRollItem,
    status: AttendanceStatus,
    workedHours = 8,
    overtimeHours = 0,
  ) => {
    setPendingMarks((prev) => ({
      ...prev,
      [item.deploymentId]: {
        status,
        workedHours,
        overtimeHours,
      },
    }));
  };

  // Bulk Save all pending marks
  const handleBulkSubmit = async () => {
    if (!musterData) return;
    const deploymentIds = Object.keys(pendingMarks);
    if (deploymentIds.length === 0) {
      alert('No new attendance changes to save');
      return;
    }

    setSaving(true);
    try {
      const recordsToSubmit = deploymentIds.map((depId) => {
        const musterItem = musterData.muster.find((m) => m.deploymentId === depId);
        const mark = pendingMarks[depId];
        return {
          employeeId: musterItem!.employee.id,
          deploymentId: depId,
          status: mark.status,
          workedHours: mark.workedHours,
          overtimeHours: mark.overtimeHours,
          supervisorRemarks: `Marked via Site Muster Roll (${mark.status})`,
        };
      });

      const res = await bulkRecordAttendance({
        shiftBusinessDate: selectedDate,
        records: recordsToSubmit,
      });

      if (res.success) {
        setSuccessMessage(`Successfully saved ${res.data?.recordedCount || recordsToSubmit.length} attendance marks.`);
        setTimeout(() => setSuccessMessage(null), 3500);
        loadMuster();
      } else {
        alert(res.error?.message || 'Failed to save muster roll');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save muster roll');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Daily Site Muster Roll"
      subtitle="Fast shift attendance recording matrix for site supervisors and field managers"
      action={
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/dashboard/attendance"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            Back to Register
          </Link>
          <button
            onClick={handleBulkSubmit}
            disabled={saving || Object.keys(pendingMarks).length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary-600), var(--primary-500))',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving || Object.keys(pendingMarks).length === 0 ? 'not-allowed' : 'pointer',
              opacity: saving || Object.keys(pendingMarks).length === 0 ? 0.6 : 1,
            }}
          >
            <Check size={16} />
            {saving
              ? 'Saving...'
              : `Save Muster Changes (${Object.keys(pendingMarks).length})`}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Banner Alert Messages */}
        {successMessage && (
          <div
            style={{
              padding: '14px 20px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '14px',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '14px 20px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '14px',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Site & Date Selectors */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Select Client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientCode} - {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Select Site Location
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            >
              {sites.length === 0 ? (
                <option value="">No sites configured for this client</option>
              ) : (
                sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteCode} - {s.siteName} ({s.city})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Muster Date (IST)
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        {/* Muster Roll Header Info */}
        {musterData && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '10px',
            }}
          >
            <div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {musterData.totalDeployments} Active Deployed Employees
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '12px' }}>
                • {musterData.recordedCount} Marked •{' '}
                {musterData.totalDeployments - musterData.recordedCount} Unmarked
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: '500' }}>
              Timezone: Asia/Kolkata (IST UTC+05:30)
            </div>
          </div>
        )}

        {/* Muster Roll Table */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: '600' }}>Employee</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: '600' }}>Designation</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: '600' }}>Shift / Vehicle</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: '600' }}>Workday</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: '600' }}>Recorded Status</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>
                    Quick Attendance Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Loading daily site muster roll...
                    </td>
                  </tr>
                ) : !musterData || musterData.muster.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No active deployments at this site on {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  musterData.muster.map((item) => {
                    const existingAtt = item.attendance;
                    const pending = pendingMarks[item.deploymentId];

                    const displayStatus = pending?.status || existingAtt?.status || null;

                    return (
                      <tr
                        key={item.deploymentId}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: pending ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                        }}
                      >
                        {/* Employee */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {item.employee.firstName} {item.employee.lastName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {item.employee.employeeCode}
                          </div>
                        </td>

                        {/* Designation */}
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                            {item.designation?.name || 'Worker'}
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {item.designation?.category || 'GENERAL'}
                          </div>
                        </td>

                        {/* Shift & Vehicle */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                              {item.isNightShift ? '🌙' : '☀️'} {item.shiftName}
                            </span>
                          </div>
                          {item.vehicle && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#818cf8', marginTop: '2px' }}>
                              <Truck size={12} />
                              <span>{item.vehicle.vehicleRegistrationNumber}</span>
                            </div>
                          )}
                        </td>

                        {/* Workday */}
                        <td style={{ padding: '14px 20px' }}>
                          {item.isScheduledWorkday ? (
                            <span style={{ fontSize: '12px', color: '#34d399', fontWeight: '500' }}>
                              Scheduled Shift
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '500' }}>
                              Weekly Off / Rest Day
                            </span>
                          )}
                        </td>

                        {/* Recorded Status */}
                        <td style={{ padding: '14px 20px' }}>
                          {displayStatus ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  background:
                                    displayStatus === 'PRESENT'
                                      ? 'rgba(16, 185, 129, 0.12)'
                                      : displayStatus === 'ABSENT'
                                      ? 'rgba(239, 68, 68, 0.12)'
                                      : displayStatus === 'HALF_DAY'
                                      ? 'rgba(245, 158, 11, 0.12)'
                                      : 'rgba(99, 102, 241, 0.12)',
                                  color:
                                    displayStatus === 'PRESENT'
                                      ? '#34d399'
                                      : displayStatus === 'ABSENT'
                                      ? '#f87171'
                                      : displayStatus === 'HALF_DAY'
                                      ? '#fbbf24'
                                      : '#818cf8',
                                }}
                              >
                                {displayStatus}
                              </span>
                              {pending && (
                                <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: '500' }}>
                                  (Pending Save)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Unmarked</span>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => handleSetStatus(item, 'PRESENT', 8, 0)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                background: displayStatus === 'PRESENT' ? '#10b981' : 'rgba(16, 185, 129, 0.08)',
                                color: displayStatus === 'PRESENT' ? '#ffffff' : '#34d399',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleSetStatus(item, 'HALF_DAY', 4, 0)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                background: displayStatus === 'HALF_DAY' ? '#f59e0b' : 'rgba(245, 158, 11, 0.08)',
                                color: displayStatus === 'HALF_DAY' ? '#ffffff' : '#fbbf24',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Half Day
                            </button>
                            <button
                              onClick={() => handleSetStatus(item, 'ABSENT', 0, 0)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: displayStatus === 'ABSENT' ? '#ef4444' : 'rgba(239, 68, 68, 0.08)',
                                color: displayStatus === 'ABSENT' ? '#ffffff' : '#f87171',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
