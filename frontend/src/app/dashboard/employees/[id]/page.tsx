'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../components/DashboardLayout';
import { 
  employeesApi, EmployeeDetailResponse, EmployeeStatus, 
  SkillMasterItem, EmployeeSensitiveResponse 
} from '../../../../lib/employees-api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Users, ArrowLeft, Edit3, Shield, ShieldCheck, 
  CheckCircle2, AlertTriangle, XCircle, Phone, Mail, 
  MapPin, Briefcase, Car, CreditCard, Award, FileText, 
  Calendar, Lock, Unlock, Plus, Trash2, ChevronRight, History
} from 'lucide-react';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();

  const [employee, setEmployee] = useState<EmployeeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SKILLS' | 'QUALIFICATIONS' | 'SALARY' | 'DOCUMENTS'>('OVERVIEW');

  // Master lists
  const [availableSkills, setAvailableSkills] = useState<SkillMasterItem[]>([]);

  // Modals state
  const [showSensitiveModal, setShowSensitiveModal] = useState(false);
  const [sensitiveReason, setSensitiveReason] = useState('');
  const [sensitiveData, setSensitiveData] = useState<EmployeeSensitiveResponse | null>(null);
  const [sensitiveLoading, setSensitiveLoading] = useState(false);
  const [sensitiveError, setSensitiveError] = useState<string | null>(null);

  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillForm, setSkillForm] = useState({
    skillId: '',
    proficiencyLevel: 'INTERMEDIATE',
    yearsOfExperience: 2,
    isPrimary: false,
  });

  const [showQualModal, setShowQualModal] = useState(false);
  const [qualForm, setQualForm] = useState({
    qualificationType: 'GRADUATION',
    degreeDiploma: '',
    institution: '',
    boardUniversity: '',
    yearOfPassing: new Date().getFullYear() - 2,
    percentageCgpa: '',
    certificateNumber: '',
  });

  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    effectiveFrom: new Date().toISOString().split('T')[0],
    basicSalary: 15000,
    hra: 6000,
    conveyanceAllowance: 1600,
    specialAllowance: 2000,
    medicalAllowance: 1250,
    otherAllowances: 0,
    pfApplicable: true,
    esiApplicable: true,
    ptApplicable: true,
    tdsApplicable: false,
    revisionReason: 'Annual Merit Revision',
  });

  const canUpdate = user?.effectivePermissions?.includes('EMPLOYEE_UPDATE');
  const canViewSensitive = user?.effectivePermissions?.includes('EMPLOYEE_VIEW_SENSITIVE');

  const fetchEmployee = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeesApi.getEmployeeById(id);
      if (res.success && res.data) {
        setEmployee(res.data);
      } else {
        setError(res.error?.message || 'Employee record not found');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  const loadSkillsMaster = async () => {
    try {
      const res = await employeesApi.getSkills();
      if (res.success && res.data) {
        setAvailableSkills(res.data);
        if (res.data.length > 0) {
          setSkillForm((prev) => ({ ...prev, skillId: res.data![0].id }));
        }
      }
    } catch (err) {
      console.error('Error loading skills master:', err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEmployee();
      loadSkillsMaster();
    }
  }, [id]);

  const handleStatusChange = async (newStatus: EmployeeStatus) => {
    if (!canUpdate) return;
    if (!confirm(`Are you sure you want to transition this employee to ${newStatus}?`)) return;

    try {
      const res = await employeesApi.updateEmployeeStatus(id, newStatus);
      if (res.success) {
        fetchEmployee();
      } else {
        alert(res.error?.message || 'Failed to update employee status');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleFetchSensitive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sensitiveReason.trim()) {
      setSensitiveError('A valid operational justification is mandatory for unmasking statutory records.');
      return;
    }

    setSensitiveLoading(true);
    setSensitiveError(null);
    try {
      const res = await employeesApi.getSensitiveData(id, sensitiveReason.trim());
      if (res.success && res.data) {
        setSensitiveData(res.data);
      } else {
        setSensitiveError(res.error?.message || 'Failed to retrieve sensitive data');
      }
    } catch (err: any) {
      setSensitiveError(err.message || 'Error communicating with server');
    } finally {
      setSensitiveLoading(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await employeesApi.addSkill(id, {
        skillId: skillForm.skillId,
        proficiencyLevel: skillForm.proficiencyLevel as any,
        yearsOfExperience: Number(skillForm.yearsOfExperience),
        isPrimary: skillForm.isPrimary,
      });

      if (res.success) {
        setShowSkillModal(false);
        fetchEmployee();
      } else {
        alert(res.error?.message || 'Failed to add skill');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding skill');
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!confirm('Are you sure you want to remove this verified skill?')) return;
    try {
      const res = await employeesApi.removeSkill(id, skillId);
      if (res.success) {
        fetchEmployee();
      } else {
        alert(res.error?.message || 'Failed to remove skill');
      }
    } catch (err: any) {
      alert(err.message || 'Error removing skill');
    }
  };

  const handleAddQualification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await employeesApi.addQualification(id, {
        qualificationType: qualForm.qualificationType,
        degreeDiploma: qualForm.degreeDiploma,
        institution: qualForm.institution,
        boardUniversity: qualForm.boardUniversity,
        yearOfPassing: Number(qualForm.yearOfPassing),
        percentageCgpa: qualForm.percentageCgpa ? Number(qualForm.percentageCgpa) : undefined,
        certificateNumber: qualForm.certificateNumber || undefined,
      });

      if (res.success) {
        setShowQualModal(false);
        fetchEmployee();
      } else {
        alert(res.error?.message || 'Failed to add qualification');
      }
    } catch (err: any) {
      alert(err.message || 'Error adding qualification');
    }
  };

  const handleSaveSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hasExisting = employee?.salaryStructures && employee.salaryStructures.length > 0;
      let res;
      if (hasExisting) {
        res = await employeesApi.reviseSalaryStructure(id, {
          effectiveFrom: salaryForm.effectiveFrom,
          basicSalary: Number(salaryForm.basicSalary),
          hra: Number(salaryForm.hra),
          conveyanceAllowance: Number(salaryForm.conveyanceAllowance),
          specialAllowance: Number(salaryForm.specialAllowance),
          medicalAllowance: Number(salaryForm.medicalAllowance),
          otherAllowances: Number(salaryForm.otherAllowances),
          pfApplicable: salaryForm.pfApplicable,
          esiApplicable: salaryForm.esiApplicable,
          ptApplicable: salaryForm.ptApplicable,
          tdsApplicable: salaryForm.tdsApplicable,
          revisionReason: salaryForm.revisionReason,
        });
      } else {
        res = await employeesApi.createSalaryStructure(id, {
          effectiveFrom: salaryForm.effectiveFrom,
          basicSalary: Number(salaryForm.basicSalary),
          hra: Number(salaryForm.hra),
          conveyanceAllowance: Number(salaryForm.conveyanceAllowance),
          specialAllowance: Number(salaryForm.specialAllowance),
          medicalAllowance: Number(salaryForm.medicalAllowance),
          otherAllowances: Number(salaryForm.otherAllowances),
          pfApplicable: salaryForm.pfApplicable,
          esiApplicable: salaryForm.esiApplicable,
          ptApplicable: salaryForm.ptApplicable,
          tdsApplicable: salaryForm.tdsApplicable,
        });
      }

      if (res.success) {
        setShowSalaryModal(false);
        fetchEmployee();
      } else {
        alert(res.error?.message || 'Failed to save salary structure');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving salary structure');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Employee Dossier">
        <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading personnel record...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !employee) {
    return (
      <DashboardLayout title="Employee Dossier">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={48} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
          <h3>Error Loading Employee</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'Record not found'}</p>
          <Link href="/dashboard/employees" className="btn-secondary">
            Return to Employee Directory
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ');
  const initials = (employee.firstName[0] + (employee.lastName ? employee.lastName[0] : '')).toUpperCase();
  const activeSalary = employee.salaryStructures?.find((s) => s.isActive);

  return (
    <DashboardLayout
      title={fullName}
      subtitle={`Employee Code: ${employee.employeeCode} • Branch: ${employee.branch?.branchName || 'Main Branch'}`}
      action={
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/dashboard/employees"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} /> Directory
          </Link>
          {canUpdate && (
            <Link
              href={`/dashboard/employees/${id}/edit`}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <Edit3 size={16} /> Edit Profile
            </Link>
          )}
        </div>
      }
    >
      {/* Dossier Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(168, 85, 247, 0.3))',
              border: '2px solid rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--primary-300)',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fullName}</h2>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: 'var(--primary-400)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                }}>
                  {employee.employeeCode}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Briefcase size={15} color="var(--primary-400)" />
                  {employee.designation?.name} ({employee.employmentType ? employee.employmentType.replace('_', ' ') : 'Regular Staff'})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={15} />
                  {employee.phone}
                </span>
                {employee.drivingLicenseNumber && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8' }}>
                    <Car size={15} />
                    DL: {employee.drivingLicenseClass || 'Commercial'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Lifecycle Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lifecycle Status:</span>
            {canUpdate ? (
              <select
                value={employee.status}
                onChange={(e) => handleStatusChange(e.target.value as EmployeeStatus)}
                className="input"
                style={{
                  width: '160px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderColor: employee.status === 'ACTIVE' ? '#10b981' : employee.status === 'ON_LEAVE' ? '#f59e0b' : '#f43f5e',
                }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="ON_LEAVE">ON LEAVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="RESIGNED">RESIGNED</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            ) : (
              <span style={{ fontWeight: 700, color: '#10b981' }}>{employee.status}</span>
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
          { key: 'OVERVIEW', label: 'Overview & Profile', icon: Users },
          { key: 'SKILLS', label: `Skills (${employee.skills?.length || 0})`, icon: Award },
          { key: 'QUALIFICATIONS', label: `Qualifications (${employee.qualifications?.length || 0})`, icon: Briefcase },
          { key: 'SALARY', label: `Salary (${employee.salaryStructures?.length || 0} Versions)`, icon: CreditCard },
          { key: 'DOCUMENTS', label: `Documents (${employee.documents?.length || 0})`, icon: FileText },
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

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          {/* Personal & Demographics */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <Users size={18} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Personal & Demographics</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Date of Birth</span>
                <strong>{new Date(employee.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Gender / Marital</span>
                <strong>{employee.gender} • {employee.maritalStatus || 'Single'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Primary Phone</span>
                <strong>{employee.phone}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Alternate Phone</span>
                <strong>{employee.alternatePhone || 'None'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Email Address</span>
                <strong>{employee.email || 'Not provided'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Current Residential Address</span>
                <p style={{ marginTop: '4px', lineHeight: '1.4' }}>{employee.currentAddress}</p>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Permanent Address</span>
                <p style={{ marginTop: '4px', lineHeight: '1.4' }}>{employee.permanentAddress}</p>
              </div>
            </div>
          </div>

          {/* Employment & Service Timeline */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <Calendar size={18} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Employment Timeline</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Joining Date</span>
                <strong>{new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Employment Type</span>
                <strong>{employee.employmentType ? employee.employmentType.replace('_', ' ') : 'Regular Full-Time'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Probation End Date</span>
                <strong>{employee.probationEndDate ? new Date(employee.probationEndDate).toLocaleDateString('en-IN') : 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Confirmation Date</span>
                <strong>{employee.confirmationDate ? new Date(employee.confirmationDate).toLocaleDateString('en-IN') : 'Pending'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Resignation Date</span>
                <strong>{employee.resignationDate ? new Date(employee.resignationDate).toLocaleDateString('en-IN') : 'None'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Last Working Date</span>
                <strong>{employee.lastWorkingDate ? new Date(employee.lastWorkingDate).toLocaleDateString('en-IN') : 'None'}</strong>
              </div>
            </div>

            {/* Emergency Contact */}
            <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', marginBottom: '6px' }}>Emergency Contact</span>
              <div style={{ fontWeight: 600 }}>
                {employee.emergencyContactName ? (
                  `${employee.emergencyContactName} (${employee.emergencyContactRelation || 'Relation N/A'}) • ${employee.emergencyContactPhone}`
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No emergency contact registered</span>
                )}
              </div>
            </div>
          </div>

          {/* Commercial Driver Profile */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <Car size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Driver License & Fleet Credentials</h3>
            </div>
            {employee.drivingLicenseNumber ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>License Number</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--primary-300)' }}>{employee.drivingLicenseNumber}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Vehicle Class</span>
                  <strong>{employee.drivingLicenseClass || 'LMV-TR'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Issue Date</span>
                  <strong>{employee.drivingLicenseIssueDate ? new Date(employee.drivingLicenseIssueDate).toLocaleDateString('en-IN') : 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Expiry Date</span>
                  <strong style={{ color: '#10b981' }}>{employee.drivingLicenseExpiryDate ? new Date(employee.drivingLicenseExpiryDate).toLocaleDateString('en-IN') : 'N/A'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Licensing Authority</span>
                  <strong>{employee.drivingLicenseAuthority || 'Transport Dept'}</strong>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                Not registered as a commercial driver.
              </div>
            )}
          </div>

          {/* Statutory & Banking Protection Card */}
          <div className="card" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} color="#10b981" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Statutory & Banking (Encrypted)</h3>
              </div>
              {canViewSensitive && (
                <button
                  onClick={() => {
                    setShowSensitiveModal(true);
                    setSensitiveData(null);
                    setSensitiveReason('');
                    setSensitiveError(null);
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#38bdf8',
                  }}
                >
                  <Unlock size={13} /> View Unmasked
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Aadhaar (Masked)</span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.aadhaarMasked || 'Not Submitted'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>PAN (Masked)</span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.panMasked || 'Not Submitted'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Bank Account</span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.bankAccountMasked || 'Not Submitted'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Bank IFSC</span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.bankIfsc || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Bank Name</span>
                <strong>{employee.bankName || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Branch Name</span>
                <strong>{employee.bankBranch || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>PF UAN</span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.uanNumber || 'Pending'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>ESIC Number</span>
                <strong style={{ fontFamily: 'monospace' }}>{employee.esicNumber || 'Pending'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SKILLS */}
      {activeTab === 'SKILLS' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Verified Skills & Specializations</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Industry certifications, operational competencies, and trade skill proficiencies
              </p>
            </div>
            {canUpdate && (
              <button
                onClick={() => setShowSkillModal(true)}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Add Skill
              </button>
            )}
          </div>

          {employee.skills?.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No skills mapped to this employee yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <th style={{ padding: '12px 16px' }}>SKILL</th>
                    <th style={{ padding: '12px 16px' }}>CATEGORY</th>
                    <th style={{ padding: '12px 16px' }}>PROFICIENCY</th>
                    <th style={{ padding: '12px 16px' }}>EXPERIENCE</th>
                    <th style={{ padding: '12px 16px' }}>PRIMARY</th>
                    {canUpdate && <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>}
                  </tr>
                </thead>
                <tbody>
                  {employee.skills?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                        {item.skill?.name || 'Skill Master'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {item.skill?.category || 'General'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: item.proficiencyLevel === 'EXPERT' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: item.proficiencyLevel === 'EXPERT' ? '#10b981' : 'var(--primary-400)',
                        }}>
                          {item.proficiencyLevel}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.88rem' }}>
                        {item.yearsOfExperience} years
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {item.isPrimary ? (
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Primary Skill</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Secondary</span>
                        )}
                      </td>
                      {canUpdate && (
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleRemoveSkill(item.skillId)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f43f5e',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUALIFICATIONS */}
      {activeTab === 'QUALIFICATIONS' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Academic & Professional Qualifications</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Verified educational degrees, technical diplomas, and trade certifications
              </p>
            </div>
            {canUpdate && (
              <button
                onClick={() => setShowQualModal(true)}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Add Qualification
              </button>
            )}
          </div>

          {employee.qualifications?.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No educational qualifications recorded yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {employee.qualifications?.map((q) => (
                <div key={q.id} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-300)' }}>
                      {q.degreeDiploma}
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-muted)',
                    }}>
                      {q.yearOfPassing}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: '4px' }}>
                    {q.institution}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {q.boardUniversity}
                  </div>
                  {q.percentageCgpa && (
                    <div style={{ fontSize: '0.8rem', marginTop: '8px', color: '#10b981', fontWeight: 600 }}>
                      Score: {q.percentageCgpa}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SALARY STRUCTURE (VERSIONED) */}
      {activeTab === 'SALARY' && (
        <div>
          {/* Active Structure Card */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={20} color="#10b981" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Current Active Salary Structure</h3>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontWeight: 700,
                  }}>
                    Active
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {activeSalary
                    ? `Effective since ${new Date(activeSalary.effectiveFrom).toLocaleDateString('en-IN')}`
                    : 'No active salary structure defined.'}
                </p>
              </div>
              {canUpdate && (
                <button
                  onClick={() => setShowSalaryModal(true)}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> {activeSalary ? 'Revise Salary Structure' : 'Set Initial Salary'}
                </button>
              )}
            </div>

            {activeSalary ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Basic Salary</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}>₹{Number(activeSalary.basicSalary).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>HRA</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}>₹{Number(activeSalary.hra).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Conveyance Allowance</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}>₹{Number(activeSalary.conveyanceAllowance).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Special Allowance</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}>₹{Number(activeSalary.specialAllowance).toLocaleString('en-IN')}</div>
                </div>
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15))',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>Monthly Gross Salary</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
                    ₹{Number(activeSalary.grossSalary).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active structure configured. Set one using the action button above.
              </div>
            )}
          </div>

          {/* Revision History */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <History size={18} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Versioned Salary Revision Log</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <th style={{ padding: '12px 16px' }}>EFFECTIVE FROM</th>
                    <th style={{ padding: '12px 16px' }}>EFFECTIVE TO</th>
                    <th style={{ padding: '12px 16px' }}>BASIC</th>
                    <th style={{ padding: '12px 16px' }}>GROSS SALARY</th>
                    <th style={{ padding: '12px 16px' }}>PF/ESI FLAGS</th>
                    <th style={{ padding: '12px 16px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.salaryStructures?.map((st) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '0.88rem' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        {new Date(st.effectiveFrom).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {st.effectiveTo ? new Date(st.effectiveTo).toLocaleDateString('en-IN') : 'Present'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        ₹{Number(st.basicSalary).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary-300)' }}>
                        ₹{Number(st.grossSalary).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.78rem' }}>
                        {st.pfApplicable && <span style={{ marginRight: '6px', color: '#10b981' }}>PF</span>}
                        {st.esiApplicable && <span style={{ marginRight: '6px', color: '#38bdf8' }}>ESI</span>}
                        {st.ptApplicable && <span style={{ color: 'var(--text-muted)' }}>PT</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {st.isActive ? (
                          <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.78rem' }}>Active</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DOCUMENTS */}
      {activeTab === 'DOCUMENTS' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Employee Verification Documents</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Statutory proof of identity, driving licenses, police verifications, and compliance records
              </p>
            </div>
          </div>

          {employee.documents?.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No uploaded documents linked to this employee master yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {employee.documents?.map((doc) => (
                <div key={doc.id} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={20} color="var(--primary-400)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{doc.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {doc.documentType} • {doc.isVerified ? 'Verified' : 'Unverified'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: SENSITIVE DATA UNMASKING */}
      {showSensitiveModal && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Lock size={20} color="#f59e0b" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Audit-Protected Statutory Decryption</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              This action will decrypt sensitive Aadhaar, PAN, and Bank Account records. Every access attempt is immutably logged with your User ID, IP, and reason.
            </p>

            {sensitiveError && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                color: '#f43f5e',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}>
                {sensitiveError}
              </div>
            )}

            {!sensitiveData ? (
              <form onSubmit={handleFetchSensitive}>
                <label className="label">Operational Justification / Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={sensitiveReason}
                  onChange={(e) => setSensitiveReason(e.target.value)}
                  placeholder="e.g. Bank transfer verification, PF claim reconciliation, Audit inspection"
                  className="input"
                  style={{ marginBottom: '20px', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSensitiveModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sensitiveLoading}
                    className="btn-primary"
                    style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                  >
                    {sensitiveLoading ? 'Decrypting...' : 'Authenticate & Decrypt'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, marginBottom: '12px' }}>
                    UNMASKED SENSITIVE VALUES (AES-256-GCM DECRYPTED)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', fontSize: '0.9rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Bank Account Number:</span>
                      <div style={{ fontWeight: 800, fontFamily: 'monospace' }}>{sensitiveData.bankAccountNumber || 'N/A'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Bank IFSC:</span>
                      <div style={{ fontWeight: 800, fontFamily: 'monospace' }}>{sensitiveData.bankIfsc || 'N/A'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Aadhaar Number:</span>
                      <div style={{ fontWeight: 800, fontFamily: 'monospace' }}>{sensitiveData.aadhaarNumber || 'N/A'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>PAN Number:</span>
                      <div style={{ fontWeight: 800, fontFamily: 'monospace' }}>{sensitiveData.panNumber || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowSensitiveModal(false)}
                    className="btn-secondary"
                  >
                    Close & Mask
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD SKILL */}
      {showSkillModal && (
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
            maxWidth: '480px',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Add Employee Skill</h3>
            <form onSubmit={handleAddSkill}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label">Skill *</label>
                <select
                  value={skillForm.skillId}
                  onChange={(e) => setSkillForm((prev) => ({ ...prev, skillId: e.target.value }))}
                  className="input"
                >
                  {availableSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label">Proficiency Level *</label>
                <select
                  value={skillForm.proficiencyLevel}
                  onChange={(e) => setSkillForm((prev) => ({ ...prev, proficiencyLevel: e.target.value }))}
                  className="input"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="EXPERT">Expert / Certified</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label">Years of Experience *</label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={skillForm.yearsOfExperience}
                  onChange={(e) => setSkillForm((prev) => ({ ...prev, yearsOfExperience: Number(e.target.value) }))}
                  className="input"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={skillForm.isPrimary}
                    onChange={(e) => setSkillForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                  />
                  Mark as Primary Deployment Skill
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowSkillModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD QUALIFICATION */}
      {showQualModal && (
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Add Academic Qualification</h3>
            <form onSubmit={handleAddQualification}>
              <div style={{ marginBottom: '14px' }}>
                <label className="label">Degree / Qualification Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech Mechanical, High School (10th), ITI Diesel Mechanic"
                  value={qualForm.degreeDiploma}
                  onChange={(e) => setQualForm((prev) => ({ ...prev, degreeDiploma: e.target.value }))}
                  className="input"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label">Institution / College *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi University, Govt ITI"
                  value={qualForm.institution}
                  onChange={(e) => setQualForm((prev) => ({ ...prev, institution: e.target.value }))}
                  className="input"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="label">Board / University *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CBSE, NCVT, State Technical Board"
                  value={qualForm.boardUniversity}
                  onChange={(e) => setQualForm((prev) => ({ ...prev, boardUniversity: e.target.value }))}
                  className="input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="label">Passing Year *</label>
                  <input
                    type="number"
                    required
                    min="1970"
                    max={new Date().getFullYear()}
                    value={qualForm.yearOfPassing}
                    onChange={(e) => setQualForm((prev) => ({ ...prev, yearOfPassing: Number(e.target.value) }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Percentage / CGPA</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 78.5"
                    value={qualForm.percentageCgpa}
                    onChange={(e) => setQualForm((prev) => ({ ...prev, percentageCgpa: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowQualModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Qualification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SALARY STRUCTURE REVISION */}
      {showSalaryModal && (
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
            maxWidth: '560px',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
              {activeSalary ? 'Revise Salary Structure (Append Version)' : 'Define Initial Salary Structure'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Historical rates are preserved immutably. The previous structure will be closed at $t-1$ day.
            </p>

            <form onSubmit={handleSaveSalaryStructure}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="label">Effective From Date *</label>
                  <input
                    type="date"
                    required
                    value={salaryForm.effectiveFrom}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Revision Reason *</label>
                  <input
                    type="text"
                    required
                    value={salaryForm.revisionReason}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, revisionReason: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="label">Basic Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    value={salaryForm.basicSalary}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, basicSalary: Number(e.target.value) }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">HRA (₹)</label>
                  <input
                    type="number"
                    value={salaryForm.hra}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, hra: Number(e.target.value) }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Conveyance Allowance (₹)</label>
                  <input
                    type="number"
                    value={salaryForm.conveyanceAllowance}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, conveyanceAllowance: Number(e.target.value) }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Special Allowance (₹)</label>
                  <input
                    type="number"
                    value={salaryForm.specialAllowance}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, specialAllowance: Number(e.target.value) }))}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={salaryForm.pfApplicable}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, pfApplicable: e.target.checked }))}
                  />
                  PF Applicable
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={salaryForm.esiApplicable}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, esiApplicable: e.target.checked }))}
                  />
                  ESI Applicable
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={salaryForm.ptApplicable}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, ptApplicable: e.target.checked }))}
                  />
                  PT Applicable
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowSalaryModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Commit Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
