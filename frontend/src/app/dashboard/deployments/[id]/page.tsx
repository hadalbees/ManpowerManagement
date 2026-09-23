'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../../components/DashboardLayout';
import {
  getDeploymentById,
  endDeployment,
  reassignDeployment,
  updateDeployment,
  getDeploymentOptions,
  DeploymentItem,
  DeploymentOptionsResponse,
  EndDeploymentPayload,
  ReassignDeploymentPayload,
} from '../../../../lib/deployments-api';
import { useAuth } from '../../../../context/AuthContext';
import {
  UserCheck,
  Building2,
  MapPin,
  Truck,
  Briefcase,
  Clock,
  Calendar,
  DollarSign,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Edit3,
  CheckSquare,
  ArrowRight,
  History,
  Moon,
} from 'lucide-react';

export default function DeploymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const deploymentId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const [deployment, setDeployment] = useState<DeploymentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [showEndModal, setShowEndModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // End Deployment State
  const [endDateInput, setEndDateInput] = useState(new Date().toISOString().substring(0, 10));
  const [endReason, setEndReason] = useState('');
  const [endRemarks, setEndRemarks] = useState('');
  const [endingInProgress, setEndingInProgress] = useState(false);

  // Reassignment State
  const [reassignOptions, setReassignOptions] = useState<DeploymentOptionsResponse | null>(null);
  const [reassignDate, setReassignDate] = useState(new Date().toISOString().substring(0, 10));
  const [reassignClientId, setReassignClientId] = useState('');
  const [reassignSiteId, setReassignSiteId] = useState('');
  const [reassignDesigId, setReassignDesigId] = useState('');
  const [reassignVehicleId, setReassignVehicleId] = useState('');
  const [reassignRateId, setReassignRateId] = useState('');
  const [reassignSalaryId, setReassignSalaryId] = useState('');
  const [reassignShiftName, setReassignShiftName] = useState('GENERAL');
  const [reassignStartTime, setReassignStartTime] = useState('09:00');
  const [reassignEndTime, setReassignEndTime] = useState('18:00');
  const [reassignNightShift, setReassignNightShift] = useState(false);
  const [reassignReason, setReassignReason] = useState('');
  const [reassignInProgress, setReassignInProgress] = useState(false);

  // Update Shift State
  const [editShiftName, setEditShiftName] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editNightShift, setEditNightShift] = useState(false);
  const [updatingInProgress, setUpdatingInProgress] = useState(false);

  const canEnd = user?.effectivePermissions?.includes('DEPLOYMENT_END');
  const canReassign = user?.effectivePermissions?.includes('DEPLOYMENT_REASSIGN');
  const canUpdate = user?.effectivePermissions?.includes('DEPLOYMENT_UPDATE');

  const fetchDeployment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDeploymentById(deploymentId);
      if (res.success && res.data) {
        setDeployment(res.data);
        setEditShiftName(res.data.shiftName);
        setEditNightShift(res.data.isNightShift);
      } else {
        setError(res.error?.message || 'Failed to load deployment');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching deployment dossier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployment();
  }, [deploymentId]);

  // Load options when opening reassign modal
  useEffect(() => {
    if (showReassignModal && deployment) {
      getDeploymentOptions(reassignClientId || undefined, deployment.employeeId).then((res) => {
        if (res.success && res.data) {
          setReassignOptions(res.data);
        }
      });
    }
  }, [showReassignModal, reassignClientId]);

  const handleEndDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endReason.trim()) {
      setError('Please provide a reason for ending this deployment.');
      return;
    }
    setEndingInProgress(true);
    try {
      const res = await endDeployment(deploymentId, {
        endDate: endDateInput,
        reason: endReason.trim(),
        remarks: endRemarks.trim() || undefined,
      });

      if (res.success && res.data) {
        setActionSuccess('Deployment safely marked as COMPLETED.');
        setShowEndModal(false);
        fetchDeployment();
      } else {
        setError(res.error?.message || 'Failed to end deployment');
      }
    } catch (err: any) {
      setError(err.message || 'Error ending deployment');
    } finally {
      setEndingInProgress(false);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignClientId || !reassignSiteId || !reassignDesigId || !reassignRateId || !reassignSalaryId || !reassignReason.trim()) {
      setError('Please fill in all required reassignment fields.');
      return;
    }
    setReassignInProgress(true);
    try {
      const payload: ReassignDeploymentPayload = {
        effectiveDate: reassignDate,
        newClientId: reassignClientId,
        newClientSiteId: reassignSiteId,
        newDesignationId: reassignDesigId,
        newBillingRateId: reassignRateId,
        newSalaryStructureId: reassignSalaryId,
        newVehicleId: reassignVehicleId || undefined,
        newShiftName: reassignShiftName,
        newShiftStartTime: reassignStartTime,
        newShiftEndTime: reassignEndTime,
        newIsNightShift: reassignNightShift,
        reason: reassignReason.trim(),
      };

      const res = await reassignDeployment(deploymentId, payload);
      if (res.success && res.data) {
        const newId = res.data.id;
        setActionSuccess('Employee reassigned successfully! Redirecting to new deployment...');
        setShowReassignModal(false);
        setTimeout(() => {
          router.push(`/dashboard/deployments/${newId}`);
        }, 1200);
      } else {
        setError(res.error?.message || 'Failed to reassign employee');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing atomic reassignment');
    } finally {
      setReassignInProgress(false);
    }
  };

  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingInProgress(true);
    try {
      const res = await updateDeployment(deploymentId, {
        shiftName: editShiftName.trim() || undefined,
        shiftStartTime: editStartTime || undefined,
        shiftEndTime: editEndTime || undefined,
        isNightShift: editNightShift,
      });

      if (res.success && res.data) {
        setActionSuccess('Shift configuration updated successfully.');
        setShowUpdateModal(false);
        fetchDeployment();
      } else {
        setError(res.error?.message || 'Failed to update shift settings');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating shift');
    } finally {
      setUpdatingInProgress(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Deployment Profile">
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" />
          <div style={{ marginTop: '12px' }}>Loading deployment record...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !deployment) {
    return (
      <DashboardLayout title="Deployment Profile">
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          <AlertCircle size={28} style={{ marginBottom: '12px' }} />
          <div>{error}</div>
          <Link href="/dashboard/deployments" style={{ display: 'inline-block', marginTop: '16px', color: '#3b82f6' }}>
            ← Back to Deployments
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!deployment) return null;

  const isActive = deployment.status === 'ACTIVE';

  return (
    <DashboardLayout
      title={`Deployment: ${deployment.employee?.firstName} ${deployment.employee?.lastName}`}
      subtitle={`Deployed at ${deployment.client?.companyName} • Site: ${deployment.clientSite?.siteName}`}
      action={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href="/dashboard/deployments"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} /> Back
          </Link>

          {isActive && canUpdate && (
            <button
              onClick={() => setShowUpdateModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Edit3 size={14} /> Edit Shift
            </button>
          )}

          {isActive && canReassign && (
            <button
              onClick={() => setShowReassignModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowRight size={14} /> Reassign Employee
            </button>
          )}

          {isActive && canEnd && (
            <button
              onClick={() => setShowEndModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <CheckSquare size={14} /> End Deployment
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Alerts */}
        {actionSuccess && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <CheckCircle2 size={16} />
            <div>{actionSuccess}</div>
          </div>
        )}

        {/* Top Status Header Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CURRENT STATUS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 700,
                background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                color: isActive ? '#10b981' : '#94a3b8',
                border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)',
              }}>
                {deployment.status}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {deployment.startDate ? deployment.startDate.substring(0, 10) : ''} → {deployment.endDate ? deployment.endDate.substring(0, 10) : 'Ongoing (Open-ended)'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              BRANCH ISOLATION
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
              {deployment.branch?.branchName} ({deployment.branch?.branchCode})
            </div>
          </div>
        </div>

        {/* 2x2 Grid of Core Relationships */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Worker Profile Card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '14px' }}>
              <UserCheck size={18} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Deployed Employee</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{deployment.employee?.firstName} {deployment.employee?.lastName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Employee Code:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{deployment.employee?.employeeCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Deployment Designation:</span>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>{deployment.designation?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                <span style={{ color: 'var(--text-primary)' }}>{deployment.designation?.category}</span>
              </div>
            </div>
          </div>

          {/* Client & Site Card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '14px' }}>
              <Building2 size={18} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Client Workplace</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Company Name:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{deployment.client?.companyName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client Code:</span>
                <span style={{ color: 'var(--text-primary)' }}>{deployment.client?.clientCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client Site:</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>{deployment.clientSite?.siteName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Site City:</span>
                <span style={{ color: 'var(--text-primary)' }}>{deployment.clientSite?.city || 'Local'}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Assignment Card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '14px' }}>
              <Truck size={18} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Assigned Fleet Vehicle</h4>
            </div>
            {deployment.vehicle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Registration:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{deployment.vehicle.vehicleRegistrationNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vehicle Model:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{deployment.vehicle.vehicleMake} {deployment.vehicle.vehicleModel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{deployment.vehicle.vehicleType}</span>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>
                No vehicle linked to this deployment (static or helper position).
              </div>
            )}
          </div>

          {/* Commercials Card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', marginBottom: '14px' }}>
              <DollarSign size={18} />
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Billing & Compensation</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client Billing Rate:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  ₹{Number(deployment.billingRate?.rateAmount).toLocaleString('en-IN')} / {deployment.billingRate?.billingModel}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Worker Basic Pay:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  ₹{Number(deployment.salaryStructure?.basicPay).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Special Allowance:</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  ₹{Number(deployment.salaryStructure?.specialAllowance || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shift Timings & Workday Schedule */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Clock size={18} style={{ color: '#3b82f6' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Shift Schedule & Scheduled Workdays</h4>
            </div>
            {deployment.isNightShift && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                <Moon size={13} /> Cross-Midnight Shift
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Shift Name: </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{deployment.shiftName}</span>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Daily Hours: </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {deployment.shiftStartTime ? new Date(deployment.shiftStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '09:00'} -{' '}
                {deployment.shiftEndTime ? new Date(deployment.shiftEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '18:00'}
              </span>
            </div>
          </div>

          {/* 7-Day Workday Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
              const dayNum = idx + 1;
              const shift = deployment.shifts?.find((s) => s.dayOfWeek === dayNum);
              const isWorkday = shift ? shift.isScheduledWorkday : true;
              return (
                <div
                  key={dayName}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: isWorkday ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-subtle)',
                    background: isWorkday ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isWorkday ? '#3b82f6' : 'var(--text-muted)' }}>
                    {dayName}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    marginTop: '4px',
                    fontWeight: 500,
                    color: isWorkday ? '#10b981' : 'var(--text-disabled)',
                  }}>
                    {isWorkday ? 'Workday' : 'Off'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Immutable Audit Log History */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
            <History size={18} style={{ color: '#6366f1' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Immutable Temporal Ledger & Audit Trail</h4>
          </div>

          {deployment.auditLogs && deployment.auditLogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deployment.auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <span style={{
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: log.action === 'CREATE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: log.action === 'CREATE' ? '#10b981' : '#3b82f6',
                      marginRight: '8px',
                    }}>
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>{log.changeSummary}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    by {log.user?.fullName || 'System User'} • {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Audit logged on primary transactions.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Safe End Deployment */}
      {showEndModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              End Active Deployment
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Safely complete this deployment in the historical ledger. The record will be retained for audit and future payroll.
            </p>

            <form onSubmit={handleEndDeployment}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  END DATE *
                </label>
                <input
                  type="date"
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  REASON FOR COMPLETION *
                </label>
                <input
                  type="text"
                  value={endReason}
                  onChange={(e) => setEndReason(e.target.value)}
                  placeholder="e.g. Contract completed, Client requested transition"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  ADDITIONAL REMARKS
                </label>
                <textarea
                  rows={2}
                  value={endRemarks}
                  onChange={(e) => setEndRemarks(e.target.value)}
                  placeholder="Handover notes..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEndModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={endingInProgress}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: endingInProgress ? 'not-allowed' : 'pointer',
                  }}
                >
                  {endingInProgress ? 'Completing...' : 'Confirm End'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reassign Employee */}
      {showReassignModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Reassign Employee
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Atomically transition {deployment.employee?.firstName} to a new client or site. Previous deployment will be capped as TRANSFERRED.
            </p>

            <form onSubmit={handleReassign} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  EFFECTIVE REASSIGNMENT DATE *
                </label>
                <input
                  type="date"
                  value={reassignDate}
                  onChange={(e) => setReassignDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    NEW CLIENT *
                  </label>
                  <select
                    value={reassignClientId}
                    onChange={(e) => {
                      setReassignClientId(e.target.value);
                      setReassignSiteId('');
                      setReassignRateId('');
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">-- Select Client --</option>
                    {reassignOptions?.clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    NEW CLIENT SITE *
                  </label>
                  <select
                    value={reassignSiteId}
                    onChange={(e) => setReassignSiteId(e.target.value)}
                    required
                    disabled={!reassignClientId}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">-- Select Site --</option>
                    {reassignOptions?.clients.find(c => c.id === reassignClientId)?.sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.siteName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    NEW DESIGNATION *
                  </label>
                  <select
                    value={reassignDesigId}
                    onChange={(e) => setReassignDesigId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">-- Select Designation --</option>
                    {reassignOptions?.designations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    NEW VEHICLE (OPTIONAL)
                  </label>
                  <select
                    value={reassignVehicleId}
                    onChange={(e) => setReassignVehicleId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">-- None (No Vehicle) --</option>
                    {reassignOptions?.vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.vehicleRegistrationNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    NEW BILLING RATE *
                  </label>
                  <select
                    value={reassignRateId}
                    onChange={(e) => setReassignRateId(e.target.value)}
                    required
                    disabled={!reassignClientId}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">-- Select Rate --</option>
                    {reassignOptions?.clientBillingRates.map((r) => (
                      <option key={r.id} value={r.id}>₹{r.rateAmount} / {r.billingModel}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    SALARY STRUCTURE *
                  </label>
                  <select
                    value={reassignSalaryId}
                    onChange={(e) => setReassignSalaryId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">-- Select Structure --</option>
                    {reassignOptions?.employees.find(e => e.id === deployment.employeeId)?.salaryStructures.map((s) => (
                      <option key={s.id} value={s.id}>Basic: ₹{Number(s.basicPay).toLocaleString('en-IN')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  REASON FOR REASSIGNMENT *
                </label>
                <input
                  type="text"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Contract expansion, replacement rotation"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignInProgress}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: reassignInProgress ? 'not-allowed' : 'pointer',
                  }}
                >
                  {reassignInProgress ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Update Shift Timings */}
      {showUpdateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Update Shift Configuration
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Adjust daily shift hours or name without mutating historical client or employee links.
            </p>

            <form onSubmit={handleUpdateShift}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  SHIFT NAME
                </label>
                <input
                  type="text"
                  value={editShiftName}
                  onChange={(e) => setEditShiftName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    START TIME
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    END TIME
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editNightShift}
                    onChange={(e) => setEditNightShift(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Cross-Midnight (Night Shift)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingInProgress}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#3b82f6',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: updatingInProgress ? 'not-allowed' : 'pointer',
                  }}
                >
                  {updatingInProgress ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
