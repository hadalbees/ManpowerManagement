'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../../components/DashboardLayout';
import { employeesApi, DesignationItem } from '../../../../../lib/employees-api';
import { 
  Users, ArrowLeft, Save, AlertTriangle, ShieldCheck, 
  Car, Phone, MapPin, Briefcase, UserCheck 
} from 'lucide-react';

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [designations, setDesignations] = useState<DesignationItem[]>([]);
  const [employeeCode, setEmployeeCode] = useState('');

  // Driver toggle
  const [isDriver, setIsDriver] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'MALE',
    maritalStatus: 'SINGLE',
    phone: '',
    alternatePhone: '',
    email: '',
    currentAddress: '',
    permanentAddress: '',
    joiningDate: '',
    probationEndDate: '',
    confirmationDate: '',
    designationId: '',
    employmentType: 'PERMANENT',
    status: 'ACTIVE',
    uanNumber: '',
    esicNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    // Driver fields
    drivingLicenseNumber: '',
    drivingLicenseClass: 'LMV-TR',
    drivingLicenseIssueDate: '',
    drivingLicenseExpiryDate: '',
    drivingLicenseAuthority: '',
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [desigRes, empRes] = await Promise.all([
          employeesApi.getDesignations(),
          employeesApi.getEmployeeById(id),
        ]);

        if (desigRes.success && desigRes.data) {
          setDesignations(desigRes.data);
        }

        if (empRes.success && empRes.data) {
          const e = empRes.data;
          setEmployeeCode(e.employeeCode);
          setIsDriver(Boolean(e.drivingLicenseNumber));
          setFormData({
            firstName: e.firstName,
            middleName: e.middleName || '',
            lastName: e.lastName,
            dateOfBirth: e.dateOfBirth ? e.dateOfBirth.split('T')[0] : '',
            gender: e.gender,
            maritalStatus: e.maritalStatus || 'SINGLE',
            phone: e.phone,
            alternatePhone: e.alternatePhone || '',
            email: e.email || '',
            currentAddress: e.currentAddress,
            permanentAddress: e.permanentAddress,
            joiningDate: e.joiningDate ? e.joiningDate.split('T')[0] : '',
            probationEndDate: e.probationEndDate ? e.probationEndDate.split('T')[0] : '',
            confirmationDate: e.confirmationDate ? e.confirmationDate.split('T')[0] : '',
            designationId: e.designationId,
            employmentType: e.employmentType,
            status: e.status,
            uanNumber: e.uanNumber || '',
            esicNumber: e.esicNumber || '',
            emergencyContactName: e.emergencyContactName || '',
            emergencyContactPhone: e.emergencyContactPhone || '',
            emergencyContactRelation: e.emergencyContactRelation || '',
            drivingLicenseNumber: e.drivingLicenseNumber || '',
            drivingLicenseClass: e.drivingLicenseClass || 'LMV-TR',
            drivingLicenseIssueDate: e.drivingLicenseIssueDate ? e.drivingLicenseIssueDate.split('T')[0] : '',
            drivingLicenseExpiryDate: e.drivingLicenseExpiryDate ? e.drivingLicenseExpiryDate.split('T')[0] : '',
            drivingLicenseAuthority: e.drivingLicenseAuthority || '',
          });
        } else {
          setError(empRes.error?.message || 'Employee record not found');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading employee record');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus || undefined,
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        email: formData.email.trim() || undefined,
        currentAddress: formData.currentAddress.trim(),
        permanentAddress: formData.permanentAddress.trim(),
        joiningDate: formData.joiningDate,
        probationEndDate: formData.probationEndDate || undefined,
        confirmationDate: formData.confirmationDate || undefined,
        designationId: formData.designationId,
        employmentType: formData.employmentType,
        status: formData.status,
        uanNumber: formData.uanNumber.trim() || undefined,
        esicNumber: formData.esicNumber.trim() || undefined,
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        emergencyContactRelation: formData.emergencyContactRelation.trim() || undefined,
      };

      if (isDriver) {
        payload.drivingLicenseNumber = formData.drivingLicenseNumber.trim() || undefined;
        payload.drivingLicenseClass = formData.drivingLicenseClass.trim() || undefined;
        payload.drivingLicenseIssueDate = formData.drivingLicenseIssueDate || undefined;
        payload.drivingLicenseExpiryDate = formData.drivingLicenseExpiryDate || undefined;
        payload.drivingLicenseAuthority = formData.drivingLicenseAuthority.trim() || undefined;
      }

      const res = await employeesApi.updateEmployee(id, payload);
      if (res.success) {
        router.push(`/dashboard/employees/${id}`);
      } else {
        setError(res.error?.message || 'Failed to update employee');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Employee">
        <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading employee details...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Edit Profile: ${formData.firstName} ${formData.lastName}`}
      subtitle={`Employee Code: ${employeeCode} (Immutable)`}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link
            href={`/dashboard/employees/${id}`}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} /> Back to Dossier
          </Link>
        </div>

        {error && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '12px',
            color: '#f43f5e',
            fontSize: '0.9rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Identity */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Users size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Personal Identity Details</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Date of Birth *</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Gender *</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="input">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Marital Status</label>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="input">
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Phone size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Contact Information & Addresses</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="label">Primary Phone (Mobile) *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Alternate Phone</label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <label className="label">Current Residential Address *</label>
                <textarea
                  name="currentAddress"
                  required
                  rows={2}
                  value={formData.currentAddress}
                  onChange={handleChange}
                  className="input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="label">Permanent Address *</label>
                <textarea
                  name="permanentAddress"
                  required
                  rows={2}
                  value={formData.permanentAddress}
                  onChange={handleChange}
                  className="input"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Employment */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <UserCheck size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Employment Role & Dates</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Primary Designation *</label>
                <select
                  name="designationId"
                  required
                  value={formData.designationId}
                  onChange={handleChange}
                  className="input"
                >
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Employment Type *</label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="PERMANENT">Permanent Full-Time</option>
                  <option value="CONTRACT">Contract Basis</option>
                  <option value="PROBATION">Probationary</option>
                  <option value="TEMPORARY">Temporary</option>
                  <option value="DAILY_WAGE">Daily Wage</option>
                </select>
              </div>

              <div>
                <label className="label">Date of Joining *</label>
                <input
                  type="date"
                  name="joiningDate"
                  required
                  value={formData.joiningDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Probation End Date</label>
                <input
                  type="date"
                  name="probationEndDate"
                  value={formData.probationEndDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Confirmation Date</label>
                <input
                  type="date"
                  name="confirmationDate"
                  value={formData.confirmationDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Driver details */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDriver ? '20px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Car size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Commercial Driver Credentials</h3>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isDriver}
                  onChange={(e) => setIsDriver(e.target.checked)}
                />
                Driver Deployment Eligible
              </label>
            </div>

            {isDriver && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div>
                  <label className="label">Driving License Number</label>
                  <input
                    type="text"
                    name="drivingLicenseNumber"
                    value={formData.drivingLicenseNumber}
                    onChange={handleChange}
                    className="input"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label className="label">License Class</label>
                  <select
                    name="drivingLicenseClass"
                    value={formData.drivingLicenseClass}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="LMV">LMV (Light Motor Vehicle)</option>
                    <option value="LMV-TR">LMV-TR (Commercial Light Transport)</option>
                    <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                    <option value="TRANS">TRANS (Heavy Goods / Bus Transport)</option>
                    <option value="MCWG">MCWG (Motorcycle with Gear)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Issue Date</label>
                  <input
                    type="date"
                    name="drivingLicenseIssueDate"
                    value={formData.drivingLicenseIssueDate}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Expiry Date</label>
                  <input
                    type="date"
                    name="drivingLicenseExpiryDate"
                    value={formData.drivingLicenseExpiryDate}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Issuing Authority</label>
                  <input
                    type="text"
                    name="drivingLicenseAuthority"
                    value={formData.drivingLicenseAuthority}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Phone size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Emergency Contact Details</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Contact Person Name</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Contact Phone</label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Relationship</label>
                <input
                  type="text"
                  name="emergencyContactRelation"
                  value={formData.emergencyContactRelation}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
            <Link href={`/dashboard/employees/${id}`} className="btn-secondary" style={{ textDecoration: 'none' }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} />
              {saving ? 'Updating Record...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
