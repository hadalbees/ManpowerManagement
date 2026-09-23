'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { recruitmentApi } from '../../../lib/phase5-api';
import { useAuth } from '../../../context/AuthContext';
import { 
  UserPlus, Search, Filter, Calendar, Award, 
  CheckCircle, ArrowRight, UserCheck, Briefcase, 
  Phone, Mail, X, AlertCircle, CheckCircle2
} from 'lucide-react';
import { PageHeader, StatusBadge, DataTable, Column } from '../../../components/ui';

export default function RecruitmentPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [stageFilter, setStageFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState<any | null>(null);
  const [showOfferModal, setShowOfferModal] = useState<any | null>(null);
  const [showConvertModal, setShowConvertModal] = useState<any | null>(null);

  // Form states
  const [candidateForm, setCandidateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'WALK_IN',
    experienceYears: 2,
    skills: 'Commercial Driving, Security Roster',
  });

  const [interviewForm, setInterviewForm] = useState({
    roundNumber: 1,
    interviewType: 'TECHNICAL',
    scheduledAt: '',
    interviewerName: 'Operations Lead',
  });

  const [offerForm, setOfferForm] = useState({
    offeredCtc: 240000,
    validUntil: '',
    joiningDate: '',
  });

  const [convertForm, setConvertForm] = useState({
    dateOfBirth: '1995-05-15',
    gender: 'MALE',
    maritalStatus: 'SINGLE',
    emergencyContactName: 'Next of Kin',
    emergencyContactPhone: '9876543210',
    emergencyContactRelation: 'Spouse',
    bankAccountNo: '123456789012',
    bankIfsc: 'SBIN0001234',
    bankName: 'State Bank of India',
    salaryStructure: {
      basicPay: 15000,
      hra: 3000,
      da: 1000,
      specialAllowance: 1000,
      effectiveFrom: new Date().toISOString().split('T')[0],
    },
  });

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recruitmentApi.getCandidates({
        stage: stageFilter || undefined,
        search: search || undefined,
        page,
        limit: 10,
      });

      if (res.success && res.data) {
        setCandidates(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
      } else {
        setError(res.error?.message || 'Failed to fetch candidate pipeline');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with recruitment engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [page, stageFilter]);

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await recruitmentApi.createCandidate({
        ...candidateForm,
        experienceYears: Number(candidateForm.experienceYears),
      });

      if (res.success) {
        setSuccess('Candidate enrolled in recruitment pipeline.');
        setShowNewCandidateModal(false);
        fetchCandidates();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.error?.message || 'Failed to create candidate');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInterviewModal) return;
    try {
      const res = await recruitmentApi.scheduleInterview(showInterviewModal.id, interviewForm);
      if (res.success) {
        setSuccess('Interview scheduled.');
        setShowInterviewModal(null);
        fetchCandidates();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to schedule interview');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleIssueOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOfferModal) return;
    try {
      const res = await recruitmentApi.issueOffer(showOfferModal.id, {
        ...offerForm,
        offeredCtc: Number(offerForm.offeredCtc),
      });
      if (res.success) {
        setSuccess('Formal offer extended to candidate.');
        setShowOfferModal(null);
        fetchCandidates();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to issue offer');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConvertToEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConvertModal) return;
    try {
      const res = await recruitmentApi.convertToEmployee(showConvertModal.id, convertForm);
      if (res.success) {
        setSuccess('Candidate onboarded into employee master roster!');
        setShowConvertModal(null);
        fetchCandidates();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.error?.message || 'Failed to convert candidate to employee');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const stages = [
    'APPLIED',
    'SCREENING',
    'INTERVIEW_SCHEDULED',
    'SKILL_TEST_PASSED',
    'DOCUMENT_VERIFIED',
    'OFFERED',
    'SELECTED',
    'HIRED',
    'REJECTED',
  ];

  const columns: Column<any>[] = [
    {
      key: 'candidate',
      header: 'Applicant',
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: 'var(--text-primary)',
            }}
          >
            {c.firstName?.[0]}
            {c.lastName?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {c.firstName} {c.lastName}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {c.phone || c.email} • Source: {c.source || 'Walk-in'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'skills',
      header: 'Experience & Competencies',
      render: (c) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
            {c.experienceYears} Years Exp
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.skills || 'General Staff'}
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Pipeline Stage',
      render: (c) => <StatusBadge status={c.stage} />,
    },
    {
      key: 'actions',
      header: 'Pipeline Progression',
      align: 'right',
      render: (c) => (
        <div style={{ display: 'inline-flex', gap: '6px' }}>
          {c.stage === 'APPLIED' && (
            <button
              onClick={() => setShowInterviewModal(c)}
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              Schedule Interview
            </button>
          )}

          {(c.stage === 'INTERVIEW_SCHEDULED' || c.stage === 'SKILL_TEST_PASSED' || c.stage === 'DOCUMENT_VERIFIED') && (
            <button
              onClick={() => setShowOfferModal(c)}
              className="btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              Extend Offer
            </button>
          )}

          {(c.stage === 'OFFERED' || c.stage === 'SELECTED') && (
            <button
              onClick={() => setShowConvertModal(c)}
              className="btn-primary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              <UserCheck size={13} /> Onboard to Staff
            </button>
          )}

          {c.stage === 'HIRED' && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald-text)', fontWeight: 600 }}>
              Onboarded
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Recruitment & Staffing Pipeline"
        subtitle="End-to-end talent acquisition: candidate intake, skill assessment, interview evaluations, formal offer letters, and employee conversion"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Recruitment' },
        ]}
        action={
          <button onClick={() => setShowNewCandidateModal(true)} className="btn-primary">
            <UserPlus size={15} /> Enroll Candidate
          </button>
        }
      />

      {success && (
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
          <span>{success}</span>
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

      {/* Stage Selector Chips */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => {
            setStageFilter('');
            setPage(1);
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid',
            borderColor: stageFilter === '' ? 'var(--accent-blue-border)' : 'var(--border-subtle)',
            background: stageFilter === '' ? 'var(--accent-blue-bg)' : '#ffffff',
            color: stageFilter === '' ? 'var(--accent-blue-text)' : 'var(--text-secondary)',
            fontWeight: stageFilter === '' ? 600 : 500,
            fontSize: '0.78rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          All Stages
        </button>

        {stages.map((st) => (
          <button
            key={st}
            onClick={() => {
              setStageFilter(st);
              setPage(1);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid',
              borderColor: stageFilter === st ? 'var(--accent-blue-border)' : 'var(--border-subtle)',
              background: stageFilter === st ? 'var(--accent-blue-bg)' : '#ffffff',
              color: stageFilter === st ? 'var(--accent-blue-text)' : 'var(--text-secondary)',
              fontWeight: stageFilter === st ? 600 : 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        columns={columns}
        data={candidates}
        loading={loading}
        error={error}
        onRetry={fetchCandidates}
        pagination={{
          page,
          totalPages,
          limit: 10,
          onPageChange: (p) => setPage(p),
        }}
        emptyTitle="Pipeline Empty"
        emptyDescription="Zero candidates currently in this stage."
        emptyAction={
          <button onClick={() => setShowNewCandidateModal(true)} className="btn-primary">
            <UserPlus size={15} /> Enroll Candidate
          </button>
        }
      />

      {/* New Candidate Modal */}
      {showNewCandidateModal && (
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
            if (e.target === e.currentTarget) setShowNewCandidateModal(false);
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Enroll New Candidate
              </h3>
              <button onClick={() => setShowNewCandidateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCandidate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.firstName}
                    onChange={(e) => setCandidateForm({ ...candidateForm, firstName: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.lastName}
                    onChange={(e) => setCandidateForm({ ...candidateForm, lastName: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>Email</label>
                  <input
                    type="email"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>Phone *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.phone}
                    onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>Source</label>
                  <select
                    value={candidateForm.source}
                    onChange={(e) => setCandidateForm({ ...candidateForm, source: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="WALK_IN">Walk-in</option>
                    <option value="REFERRAL">Staff Referral</option>
                    <option value="PORTAL">Job Portal</option>
                    <option value="SUB_AGENT">Regional Sub-Agent</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>Experience (Yrs)</label>
                  <input
                    type="number"
                    min="0"
                    value={candidateForm.experienceYears}
                    onChange={(e) => setCandidateForm({ ...candidateForm, experienceYears: Number(e.target.value) })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>Skills & Licenses</label>
                <input
                  type="text"
                  placeholder="e.g. Heavy Commercial, Security Ex-Serviceman"
                  value={candidateForm.skills}
                  onChange={(e) => setCandidateForm({ ...candidateForm, skills: e.target.value })}
                  className="input"
                  style={{ width: '100%', height: '36px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowNewCandidateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Enroll in Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Employee Modal */}
      {showConvertModal && (
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
            if (e.target === e.currentTarget) setShowConvertModal(null);
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Onboard Candidate as Full Employee
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Transform <strong>{showConvertModal.firstName} {showConvertModal.lastName}</strong> into an active agency personnel record.
            </p>

            <form onSubmit={handleConvertToEmployee}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={convertForm.dateOfBirth}
                    onChange={(e) => setConvertForm({ ...convertForm, dateOfBirth: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>Gender *</label>
                  <select
                    value={convertForm.gender}
                    onChange={(e) => setConvertForm({ ...convertForm, gender: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>Bank Account # *</label>
                  <input
                    type="text"
                    required
                    value={convertForm.bankAccountNo}
                    onChange={(e) => setConvertForm({ ...convertForm, bankAccountNo: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>IFSC Code *</label>
                  <input
                    type="text"
                    required
                    value={convertForm.bankIfsc}
                    onChange={(e) => setConvertForm({ ...convertForm, bankIfsc: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button type="button" onClick={() => setShowConvertModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
