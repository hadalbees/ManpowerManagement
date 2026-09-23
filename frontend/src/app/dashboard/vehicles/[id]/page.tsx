'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../components/DashboardLayout';
import { 
  vehiclesApi, VehicleDetailResponse, VehicleStatus 
} from '../../../../lib/vehicles-api';
import { employeesApi, EmployeeItem } from '../../../../lib/employees-api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Truck, ArrowLeft, Edit3, User, Calendar, 
  Gauge, Fuel, Wrench, ShieldBan, CheckCircle2, 
  AlertTriangle, Plus, FileText, Check, Clock, RotateCcw
} from 'lucide-react';

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();

  const [vehicle, setVehicle] = useState<VehicleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'HISTORY' | 'DOCUMENTS'>('OVERVIEW');

  // Active Drivers list for assignment modal
  const [eligibleDrivers, setEligibleDrivers] = useState<EmployeeItem[]>([]);

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    startDatetime: new Date().toISOString().slice(0, 16),
    startOdometerKm: 0,
    handoverConditionNotes: '',
    reasonForChange: 'Regular Shift Assignment',
  });

  const [showEndModal, setShowEndModal] = useState(false);
  const [endForm, setEndForm] = useState({
    endDatetime: new Date().toISOString().slice(0, 16),
    endOdometerKm: 0,
    returnConditionNotes: '',
    reasonForChange: 'Assignment Completed',
  });

  const canUpdate = user?.effectivePermissions?.includes('VEHICLE_UPDATE');
  const canAssign = user?.effectivePermissions?.includes('VEHICLE_ASSIGN');

  const fetchVehicle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vehiclesApi.getVehicleById(id);
      if (res.success && res.data) {
        setVehicle(res.data);
        setAssignForm((prev) => ({
          ...prev,
          startOdometerKm: res.data!.currentOdometerKm,
        }));
        setEndForm((prev) => ({
          ...prev,
          endOdometerKm: res.data!.currentOdometerKm,
        }));
      } else {
        setError(res.error?.message || 'Vehicle record not found');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleDrivers = async () => {
    try {
      const res = await employeesApi.getEmployees({ status: 'ACTIVE', limit: 100 });
      if (res.success && res.data) {
        setEligibleDrivers(res.data.items || []);
        if (res.data.items.length > 0) {
          setAssignForm((prev) => ({ ...prev, employeeId: res.data!.items[0].id }));
        }
      }
    } catch (err) {
      console.error('Error loading drivers:', err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchVehicle();
      loadEligibleDrivers();
    }
  }, [id]);

  const handleStatusChange = async (newStatus: VehicleStatus) => {
    if (!canUpdate) return;
    if (!confirm(`Are you sure you want to transition vehicle status to ${newStatus}?`)) return;

    try {
      const res = await vehiclesApi.updateVehicleStatus(id, newStatus);
      if (res.success) {
        fetchVehicle();
      } else {
        alert(res.error?.message || 'Failed to update vehicle status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await vehiclesApi.assignVehicle(id, {
        employeeId: assignForm.employeeId,
        startDatetime: new Date(assignForm.startDatetime).toISOString(),
        startOdometerKm: Number(assignForm.startOdometerKm),
        handoverConditionNotes: assignForm.handoverConditionNotes.trim() || undefined,
        reasonForChange: assignForm.reasonForChange.trim() || undefined,
      });

      if (res.success) {
        setShowAssignModal(false);
        fetchVehicle();
      } else {
        alert(res.error?.message || 'Failed to assign driver');
      }
    } catch (err: any) {
      alert(err.message || 'Error assigning driver');
    }
  };

  const handleEndAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle?.currentAssignment) return;

    if (Number(endForm.endOdometerKm) < vehicle.currentAssignment.startOdometerKm) {
      alert(`End odometer (${endForm.endOdometerKm} km) cannot be less than start odometer (${vehicle.currentAssignment.startOdometerKm} km).`);
      return;
    }

    try {
      const res = await vehiclesApi.endVehicleAssignment(id, vehicle.currentAssignment.id, {
        endDatetime: new Date(endForm.endDatetime).toISOString(),
        endOdometerKm: Number(endForm.endOdometerKm),
        returnConditionNotes: endForm.returnConditionNotes.trim() || undefined,
        reasonForChange: endForm.reasonForChange.trim() || undefined,
      });

      if (res.success) {
        setShowEndModal(false);
        fetchVehicle();
      } else {
        alert(res.error?.message || 'Failed to complete vehicle handover');
      }
    } catch (err: any) {
      alert(err.message || 'Error completing handover');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Vehicle Dossier">
        <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading vehicle specifications and history...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !vehicle) {
    return (
      <DashboardLayout title="Vehicle Dossier">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={48} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
          <h3>Error Loading Vehicle</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'Record not found'}</p>
          <Link href="/dashboard/vehicles" className="btn-secondary">
            Return to Fleet Directory
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const currentDriver = vehicle.currentAssignment?.employee;

  return (
    <DashboardLayout
      title={`${vehicle.vehicleMake} ${vehicle.vehicleModel}`}
      subtitle={`Registration: ${vehicle.vehicleRegistrationNumber} • Branch: ${vehicle.branch?.branchName || 'Main Branch'}`}
      action={
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/dashboard/vehicles"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} /> Fleet Directory
          </Link>
          {canUpdate && (
            <Link
              href={`/dashboard/vehicles/${id}/edit`}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <Edit3 size={16} /> Edit Specs
            </Link>
          )}
        </div>
      }
    >
      {/* Vehicle Summary Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              fontFamily: 'monospace',
              fontWeight: 900,
              fontSize: '1.4rem',
              color: 'var(--primary-300)',
              letterSpacing: '0.05em',
            }}>
              {vehicle.vehicleRegistrationNumber}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {vehicle.vehicleMake} {vehicle.vehicleModel}
                </h2>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-muted)',
                }}>
                  {vehicle.manufacturingYear}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>Type: <strong>{vehicle.vehicleType}</strong></span>
                <span>•</span>
                <span>Fuel: <strong>{vehicle.fuelType}</strong></span>
                <span>•</span>
                <span>Odometer: <strong>{vehicle.currentOdometerKm.toLocaleString('en-IN')} km</strong></span>
                {vehicle.clientId && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#a855f7', fontWeight: 700 }}>
                      Dedicated: {vehicle.client?.companyName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lifecycle Status:</span>
            {canUpdate ? (
              <select
                value={vehicle.status}
                onChange={(e) => handleStatusChange(e.target.value as VehicleStatus)}
                className="input"
                style={{
                  width: '180px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderColor: vehicle.status === 'AVAILABLE' ? '#10b981' : vehicle.status === 'ASSIGNED' ? '#3b82f6' : '#f59e0b',
                }}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                <option value="GROUNDED">GROUNDED</option>
              </select>
            ) : (
              <span style={{ fontWeight: 700 }}>{vehicle.status}</span>
            )}
          </div>
        </div>
      </div>

      {/* Current Assignment Spotlight Banner */}
      <div className="card" style={{
        marginBottom: '24px',
        border: vehicle.currentAssignment ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-subtle)',
        background: vehicle.currentAssignment ? 'rgba(59, 130, 246, 0.03)' : 'var(--bg-surface)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <User size={18} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Current Driver Assignment</h3>
              <span style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '10px',
                background: vehicle.currentAssignment ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: vehicle.currentAssignment ? '#60a5fa' : '#10b981',
                fontWeight: 700,
              }}>
                {vehicle.currentAssignment ? 'Active Handover' : 'Available for Driver'}
              </span>
            </div>

            {vehicle.currentAssignment && currentDriver ? (
              <div style={{ fontSize: '0.88rem', marginTop: '6px' }}>
                Assigned to: <strong>{currentDriver.firstName} {currentDriver.lastName}</strong> ({currentDriver.employeeCode}) • Phone: {currentDriver.phone}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Handover on {new Date(vehicle.currentAssignment.startDatetime).toLocaleString('en-IN')} at {vehicle.currentAssignment.startOdometerKm.toLocaleString('en-IN')} km
                  {vehicle.currentAssignment.handoverConditionNotes && ` • Notes: "${vehicle.currentAssignment.handoverConditionNotes}"`}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                This vehicle is currently parked and available for dispatch in the Chennai fleet pool.
              </p>
            )}
          </div>

          <div>
            {vehicle.currentAssignment ? (
              canAssign && (
                <button
                  onClick={() => setShowEndModal(true)}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}
                >
                  <RotateCcw size={16} /> Complete Return Handover
                </button>
              )
            ) : (
              canAssign && vehicle.status === 'AVAILABLE' && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Assign Driver
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '24px',
        overflowX: 'auto',
      }}>
        {[
          { key: 'OVERVIEW', label: 'Technical Specifications', icon: Truck },
          { key: 'HISTORY', label: `Assignment Ledger (${vehicle.assignments?.length || 0})`, icon: Clock },
          { key: 'DOCUMENTS', label: `Compliance Documents (${vehicle.documents?.length || 0})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary-400)' : '2px solid transparent',
                color: isActive ? 'var(--primary-400)' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: TECHNICAL OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>Technical Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Registration Number</span>
                <strong style={{ fontFamily: 'monospace' }}>{vehicle.vehicleRegistrationNumber}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Vehicle Type</span>
                <strong>{vehicle.vehicleType}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Make / Brand</span>
                <strong>{vehicle.vehicleMake}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Model</span>
                <strong>{vehicle.vehicleModel}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Fuel Type</span>
                <strong>{vehicle.fuelType}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Manufacturing Year</span>
                <strong>{vehicle.manufacturingYear}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Chassis (VIN)</span>
                <strong style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{vehicle.chassisNumber}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Engine Number</span>
                <strong style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{vehicle.engineNumber}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Current Odometer Reading</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--primary-300)' }}>
                  {vehicle.currentOdometerKm.toLocaleString('en-IN')} kilometers
                </strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>Operations & Allocation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Operating Branch</span>
                <strong>{vehicle.branch?.branchName} ({vehicle.branch?.branchCode})</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Ownership Classification</span>
                <strong>{vehicle.clientId ? `Client Dedicated (${vehicle.client?.companyName})` : 'Agency Owned Pool'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Registration Date in System</span>
                <strong>{new Date(vehicle.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Total Historical Assignments</span>
                <strong>{vehicle.assignments?.length || 0} driver allocations recorded</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGNMENT HISTORY (TEMPORAL LEDGER) */}
      {activeTab === 'HISTORY' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Vehicle Driver Allocation History</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Immutable temporal ledger tracking sequential driver handovers, odometers, and inspections
              </p>
            </div>
          </div>

          {vehicle.assignments?.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No driver assignments recorded for this vehicle yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <th style={{ padding: '12px 16px' }}>DRIVER</th>
                    <th style={{ padding: '12px 16px' }}>START PERIOD</th>
                    <th style={{ padding: '12px 16px' }}>RETURN PERIOD</th>
                    <th style={{ padding: '12px 16px' }}>ODOMETER RANGE</th>
                    <th style={{ padding: '12px 16px' }}>HANDOVER / RETURN NOTES</th>
                    <th style={{ padding: '12px 16px' }}>ASSIGNED BY</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.assignments?.map((a) => {
                    const isCurrent = !a.endDatetime;
                    const distance = a.endOdometerKm ? a.endOdometerKm - a.startOdometerKm : null;

                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700 }}>
                            {a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : 'Unassigned'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {a.employee?.employeeCode}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div>{new Date(a.startDatetime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(a.startDatetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {isCurrent ? (
                            <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem' }}>
                              Currently Active
                            </span>
                          ) : (
                            <div>
                              <div>{new Date(a.endDatetime!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(a.endDatetime!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div>{a.startOdometerKm.toLocaleString('en-IN')} km → {a.endOdometerKm ? `${a.endOdometerKm.toLocaleString('en-IN')} km` : 'Present'}</div>
                          {distance !== null && (
                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                              +{distance.toLocaleString('en-IN')} km driven
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                          {a.handoverConditionNotes && (
                            <div style={{ fontSize: '0.78rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Handover:</span> {a.handoverConditionNotes}
                            </div>
                          )}
                          {a.returnConditionNotes && (
                            <div style={{ fontSize: '0.78rem', marginTop: '2px', color: '#f59e0b' }}>
                              <span>Return:</span> {a.returnConditionNotes}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {a.assignedBy?.fullName || 'Super Admin'}
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

      {/* TAB 3: DOCUMENTS */}
      {activeTab === 'DOCUMENTS' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Vehicle Compliance Documents</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Registration Certificate (RC), Commercial Insurance, Fitness Certificate, and Road Permits
          </p>

          {vehicle.documents?.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No statutory documents attached to this vehicle profile yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {vehicle.documents?.map((doc) => (
                <div key={doc.id} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={20} color="var(--primary-400)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{doc.documentType?.name || 'Document'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Status: {doc.verificationStatus} • Number: {doc.documentNumber || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ASSIGN DRIVER */}
      {showAssignModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
              Assign Driver to {vehicle.vehicleRegistrationNumber}
            </h3>

            <form onSubmit={handleAssignSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label">Select Eligible Driver *</label>
                <select
                  required
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                  className="input"
                >
                  {eligibleDrivers.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode}) {emp.drivingLicenseClass ? `• DL: ${emp.drivingLicenseClass}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="label">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={assignForm.startDatetime}
                    onChange={(e) => setAssignForm((prev) => ({ ...prev, startDatetime: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Start Odometer (km) *</label>
                  <input
                    type="number"
                    required
                    min={vehicle.currentOdometerKm}
                    value={assignForm.startOdometerKm}
                    onChange={(e) => setAssignForm((prev) => ({ ...prev, startOdometerKm: Number(e.target.value) }))}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label">Handover Checklist / Condition Notes</label>
                <textarea
                  rows={2}
                  value={assignForm.handoverConditionNotes}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, handoverConditionNotes: e.target.value }))}
                  placeholder="e.g. Full fuel tank, spare wheel verified, jack kit present"
                  className="input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label">Reason / Assignment Purpose</label>
                <input
                  type="text"
                  value={assignForm.reasonForChange}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, reasonForChange: e.target.value }))}
                  className="input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: END ASSIGNMENT */}
      {showEndModal && vehicle.currentAssignment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
              Complete Return Handover: {vehicle.vehicleRegistrationNumber}
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Ending active assignment for driver: <strong>{currentDriver?.firstName} {currentDriver?.lastName}</strong>.
              Starting odometer was {vehicle.currentAssignment.startOdometerKm.toLocaleString('en-IN')} km.
            </p>

            <form onSubmit={handleEndAssignmentSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="label">Return Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endForm.endDatetime}
                    onChange={(e) => setEndForm((prev) => ({ ...prev, endDatetime: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">End Odometer (km) *</label>
                  <input
                    type="number"
                    required
                    min={vehicle.currentAssignment.startOdometerKm}
                    value={endForm.endOdometerKm}
                    onChange={(e) => setEndForm((prev) => ({ ...prev, endOdometerKm: Number(e.target.value) }))}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label">Return Condition Notes</label>
                <textarea
                  rows={2}
                  value={endForm.returnConditionNotes}
                  onChange={(e) => setEndForm((prev) => ({ ...prev, returnConditionNotes: e.target.value }))}
                  placeholder="e.g. Returned cleanly, minor scratch on left fender, fuel 50%"
                  className="input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label">Handover Reason</label>
                <input
                  type="text"
                  value={endForm.reasonForChange}
                  onChange={(e) => setEndForm((prev) => ({ ...prev, reasonForChange: e.target.value }))}
                  className="input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowEndModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Accept Return & Mark Available
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
