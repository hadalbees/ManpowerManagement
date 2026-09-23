'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../components/DashboardLayout';
import { employeesApi, DesignationItem } from '../../../../lib/employees-api';
import { 
  Users, ArrowLeft, Save, AlertTriangle, ShieldCheck, 
  Car, Building2, CreditCard, Phone, MapPin, UserCheck 
} from 'lucide-react';

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [designations, setDesignations] = useState<DesignationItem[]>([]);

  // Address copy state
  const [sameAddress, setSameAddress] = useState(true);

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
    joiningDate: new Date().toISOString().split('T')[0],
    probationEndDate: '',
    designationId: '',
    employmentType: 'PERMANENT',
    uanNumber: '',
    esicNumber: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankName: '',
    bankBranch: '',
    panNumber: '',
    aadhaarNumber: '',
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
    async function loadDesignations() {
      try {
        const res = await employeesApi.getDesignations();
        if (res.success && res.data) {
          setDesignations(res.data);
          if (res.data.length > 0) {
            setFormData((prev) => ({ ...prev, designationId: res.data![0].id }));
          }
        }
      } catch (err) {
        console.error('Error fetching designations:', err);
      }
    }
    loadDesignations();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (sameAddress && name === 'currentAddress') {
        updated.permanentAddress = value;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic client-side checks
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.phone || !formData.designationId) {
      setError('Please fill all required basic details (First Name, Last Name, DOB, Phone, and Designation).');
      setLoading(false);
      return;
    }

    if (formData.aadhaarNumber && !/^\d{12}$/.test(formData.aadhaarNumber)) {
      setError('Aadhaar number must be exactly 12 numeric digits.');
      setLoading(false);
      return;
    }

    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.toUpperCase())) {
      setError('PAN format must be standard 10 characters (e.g. ABCDE1234F).');
      setLoading(false);
      return;
    }

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
        permanentAddress: (sameAddress ? formData.currentAddress : formData.permanentAddress).trim(),
        joiningDate: formData.joiningDate,
        probationEndDate: formData.probationEndDate || undefined,
        designationId: formData.designationId,
        employmentType: formData.employmentType,
        uanNumber: formData.uanNumber.trim() || undefined,
        esicNumber: formData.esicNumber.trim() || undefined,
        bankAccountNumber: formData.bankAccountNumber.trim() || undefined,
        bankIfsc: formData.bankIfsc.trim().toUpperCase() || undefined,
        bankName: formData.bankName.trim() || undefined,
        bankBranch: formData.bankBranch.trim() || undefined,
        panNumber: formData.panNumber.trim().toUpperCase() || undefined,
        aadhaarNumber: formData.aadhaarNumber.trim() || undefined,
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

      const res = await employeesApi.createEmployee(payload);
      if (res.success && res.data) {
        router.push(`/dashboard/employees/${res.data.id}`);
      } else {
        setError(res.error?.message || 'Failed to onboard employee');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Onboard New Employee"
      subtitle="Register personnel into the agency roster, set designations, statutory credentials, and compliance records"
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link
            href="/dashboard/employees"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} /> Back to Directory
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
          {/* Section 1: Basic Identity */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Users size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>1. Personal & Identity Details</h3>
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
                  placeholder="e.g. Ramesh"
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
                  placeholder="e.g. Kumar"
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
                  placeholder="e.g. Sharma"
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

          {/* Section 2: Contact & Address */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Phone size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>2. Contact Information & Residences</h3>
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
                  placeholder="e.g. 9876543210"
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
                  placeholder="e.g. 9876543211"
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
                  placeholder="e.g. ramesh.sharma@example.com"
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
                  placeholder="Plot / House No, Street, Landmark, City, State, PIN"
                  className="input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="label" style={{ margin: 0 }}>Permanent Address *</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--primary-400)' }}>
                    <input
                      type="checkbox"
                      checked={sameAddress}
                      onChange={(e) => {
                        setSameAddress(e.target.checked);
                        if (e.target.checked) {
                          setFormData((prev) => ({ ...prev, permanentAddress: prev.currentAddress }));
                        }
                      }}
                    />
                    Same as Current Address
                  </label>
                </div>
                <textarea
                  name="permanentAddress"
                  required
                  disabled={sameAddress}
                  rows={2}
                  value={sameAddress ? formData.currentAddress : formData.permanentAddress}
                  onChange={handleChange}
                  placeholder="Permanent village / hometown address"
                  className="input"
                  style={{ resize: 'vertical', opacity: sameAddress ? 0.7 : 1 }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Employment Role */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <UserCheck size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>3. Employment Terms & Designation</h3>
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
            </div>
          </div>

          {/* Section 4: Driver Credentials (Optional) */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isDriver ? '20px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Car size={20} color="#38bdf8" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>4. Commercial Driver Verification</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Required for chauffeur, heavy transport, and fleet driver deployments</p>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isDriver}
                  onChange={(e) => setIsDriver(e.target.checked)}
                />
                Is Driver / Heavy Vehicle Operator
              </label>
            </div>

            {isDriver && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div>
                  <label className="label">Driving License (DL) Number *</label>
                  <input
                    type="text"
                    name="drivingLicenseNumber"
                    required={isDriver}
                    value={formData.drivingLicenseNumber}
                    onChange={handleChange}
                    placeholder="e.g. DL-0420110012345"
                    className="input"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label className="label">License Class *</label>
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
                  <label className="label">DL Issue Date</label>
                  <input
                    type="date"
                    name="drivingLicenseIssueDate"
                    value={formData.drivingLicenseIssueDate}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">DL Expiry Date *</label>
                  <input
                    type="date"
                    name="drivingLicenseExpiryDate"
                    required={isDriver}
                    value={formData.drivingLicenseExpiryDate}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Issuing RTO Authority</label>
                  <input
                    type="text"
                    name="drivingLicenseAuthority"
                    value={formData.drivingLicenseAuthority}
                    onChange={handleChange}
                    placeholder="e.g. RTO Delhi South (DL-04)"
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Statutory & Banking Details */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <ShieldCheck size={20} color="#10b981" />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>5. Statutory Compliance & Banking (Encrypted at Rest)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Aadhaar, PAN, and Bank Account are encrypted with military-grade AES-256-GCM.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Aadhaar Number (12 Digits)</label>
                <input
                  type="text"
                  name="aadhaarNumber"
                  maxLength={12}
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                  placeholder="e.g. 987654321012"
                  className="input"
                />
              </div>

              <div>
                <label className="label">PAN Card Number (10 Chars)</label>
                <input
                  type="text"
                  name="panNumber"
                  maxLength={10}
                  value={formData.panNumber}
                  onChange={handleChange}
                  placeholder="e.g. ABCDE1234F"
                  className="input"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="label">UAN Number (PF)</label>
                <input
                  type="text"
                  name="uanNumber"
                  value={formData.uanNumber}
                  onChange={handleChange}
                  placeholder="e.g. 100987654321"
                  className="input"
                />
              </div>

              <div>
                <label className="label">ESIC IP Number</label>
                <input
                  type="text"
                  name="esicNumber"
                  value={formData.esicNumber}
                  onChange={handleChange}
                  placeholder="e.g. 31000987654321"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Bank Account Number</label>
                <input
                  type="text"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  placeholder="e.g. 50100234567890"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Bank IFSC Code</label>
                <input
                  type="text"
                  name="bankIfsc"
                  maxLength={11}
                  value={formData.bankIfsc}
                  onChange={handleChange}
                  placeholder="e.g. HDFC0001234"
                  className="input"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="label">Bank Name</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="e.g. HDFC Bank Ltd"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Branch Name</label>
                <input
                  type="text"
                  name="bankBranch"
                  value={formData.bankBranch}
                  onChange={handleChange}
                  placeholder="e.g. Connaught Place, New Delhi"
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Emergency Contact */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Phone size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>6. Emergency Contact Details</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Contact Person Name</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="e.g. Sunita Sharma"
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
                  placeholder="e.g. 9811223344"
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
                  placeholder="e.g. Spouse / Brother / Father"
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
            <Link href="/dashboard/employees" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} />
              {loading ? 'Creating Record...' : 'Complete Onboarding'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
