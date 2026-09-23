'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { documentsApi } from '../../../lib/phase5-api';
import { useAuth } from '../../../context/AuthContext';
import { 
  FolderLock, Search, Filter, Plus, Download, 
  FileText, AlertCircle, History, Shield, Trash2, CheckCircle2, X
} from 'lucide-react';
import { PageHeader, StatusBadge, DataTable, Column } from '../../../components/ui';

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState<any | null>(null);
  const [showVersionsModal, setShowVersionsModal] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);

  // Upload Form State
  const [uploadData, setUploadData] = useState({
    entityType: 'EMPLOYEE',
    entityId: '',
    documentType: 'ID_PROOF',
    title: '',
    fileName: '',
    mimeType: 'application/pdf',
    fileSize: 1024,
    checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    expiryDate: '',
    isConfidential: false,
    fileBase64: '',
  });

  const [verifyStatus, setVerifyStatus] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentsApi.getDocuments({
        entityType: entityType || undefined,
        verificationStatus: verificationStatus || undefined,
        search: search || undefined,
        page,
        limit: 10,
      });

      if (res.success && res.data) {
        setDocuments(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
      } else {
        setError(res.error?.message || 'Failed to fetch documents');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, entityType, verificationStatus]);

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string)?.split(',')[1] || '';
      setUploadData((prev) => ({
        ...prev,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        fileSize: file.size,
        fileBase64: base64,
        title: prev.title || file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await documentsApi.uploadDocument(uploadData);
      if (res.success) {
        setSuccess('Document uploaded and checksum registered successfully.');
        setShowUploadModal(false);
        fetchDocuments();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.error?.message || 'Failed to upload document');
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading document');
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showVerifyModal) return;

    try {
      const res = await documentsApi.verifyDocument(showVerifyModal.id, {
        status: verifyStatus,
        rejectionReason: verifyStatus === 'REJECTED' ? rejectionReason : undefined,
      });

      if (res.success) {
        setSuccess(`Document marked as ${verifyStatus}.`);
        setShowVerifyModal(null);
        fetchDocuments();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(res.error?.message || 'Failed to verify document');
      }
    } catch (err: any) {
      setError(err.message || 'Error verifying document');
    }
  };

  const handleViewVersions = async (doc: any) => {
    setShowVersionsModal(doc);
    try {
      const res = await documentsApi.getDocumentVersions(doc.id);
      if (res.success && res.data) {
        setVersions(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document from the vault?')) return;
    try {
      const res = await documentsApi.deleteDocument(id);
      if (res.success) {
        setSuccess('Document removed from records.');
        fetchDocuments();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error?.message || 'Failed to delete document');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting document');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: 'Document & Vault Record',
      render: (doc) => (
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
              color: 'var(--accent-blue)',
              flexShrink: 0,
            }}
          >
            <FileText size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {doc.title || doc.fileName}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {doc.fileName} • v{doc.currentVersion || 1}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Owner / Entity Scope',
      render: (doc) => (
        <div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            {doc.entityType}
          </span>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            ID: {doc.entityId?.slice(0, 8)}...
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Category',
      render: (doc) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {doc.documentType?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'expiry',
      header: 'Expiry Date',
      render: (doc) => {
        if (!doc.expiryDate) return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Expiry</span>;
        const diff = Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        const isExp = diff < 0;
        const isSoon = diff >= 0 && diff <= 30;

        return (
          <div>
            <div style={{ fontWeight: 600, color: isExp ? 'var(--accent-rose-text)' : isSoon ? 'var(--accent-amber-text)' : 'var(--text-primary)' }}>
              {new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '0.7rem', color: isExp ? 'var(--accent-rose-text)' : isSoon ? 'var(--accent-amber-text)' : 'var(--text-muted)' }}>
              {isExp ? `Expired ${Math.abs(diff)}d ago` : isSoon ? `Expires in ${diff}d` : `Valid (${diff}d)`}
            </div>
          </div>
        );
      },
    },
    {
      key: 'verificationStatus',
      header: 'Verification',
      render: (doc) => <StatusBadge status={doc.verificationStatus} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (doc) => (
        <div style={{ display: 'inline-flex', gap: '6px' }}>
          <button
            onClick={() => setShowVerifyModal(doc)}
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Verify Status"
          >
            <Shield size={12} /> Verify
          </button>
          <button
            onClick={() => handleViewVersions(doc)}
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            title="Version History"
          >
            <History size={12} />
          </button>
          <button
            onClick={() => handleDelete(doc.id)}
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--accent-rose-text)' }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Document Management & Vault"
        subtitle="Cryptographically verified statutory credentials, identity proofs, vehicle licenses, and version control audit trails"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Documents' },
        ]}
        action={
          <button onClick={() => setShowUploadModal(true)} className="btn-primary">
            <Plus size={15} /> Upload Document
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

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search document title or file name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '34px', width: '100%', height: '36px' }}
            />
          </div>
          <button type="button" onClick={() => fetchDocuments()} className="btn-secondary" style={{ height: '36px' }}>
            Filter
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="input"
            style={{ width: '140px', height: '36px', padding: '6px 10px' }}
          >
            <option value="">All Scopes</option>
            <option value="EMPLOYEE">Employees</option>
            <option value="CLIENT">Clients</option>
            <option value="VEHICLE">Vehicles</option>
            <option value="AGENCY">Agency Corporate</option>
          </select>

          <select
            value={verificationStatus}
            onChange={(e) => {
              setVerificationStatus(e.target.value);
              setPage(1);
            }}
            className="input"
            style={{ width: '150px', height: '36px', padding: '6px 10px' }}
          >
            <option value="">All Verifications</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="PENDING">Pending Review</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        columns={columns}
        data={documents}
        loading={loading}
        error={error}
        onRetry={fetchDocuments}
        pagination={{
          page,
          totalPages,
          limit: 10,
          onPageChange: (p) => setPage(p),
        }}
        emptyTitle="No Documents Found"
        emptyDescription="Zero statutory documents located in the secure vault."
        emptyAction={
          <button onClick={() => setShowUploadModal(true)} className="btn-primary">
            <Plus size={15} /> Upload First Document
          </button>
        }
      />

      {/* Upload Document Modal */}
      {showUploadModal && (
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
            if (e.target === e.currentTarget) setShowUploadModal(false);
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Upload Document to Secure Vault
              </h3>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Entity Scope *
                  </label>
                  <select
                    value={uploadData.entityType}
                    onChange={(e) => setUploadData({ ...uploadData, entityType: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="CLIENT">Client</option>
                    <option value="VEHICLE">Vehicle</option>
                    <option value="AGENCY">Agency</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Owner UUID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Entity UUID"
                    value={uploadData.entityId}
                    onChange={(e) => setUploadData({ ...uploadData, entityId: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Heavy Driving License"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="input"
                  style={{ width: '100%', height: '36px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    value={uploadData.documentType}
                    onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  >
                    <option value="ID_PROOF">Identity Proof</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="CONTRACT">Agreement / Contract</option>
                    <option value="CERTIFICATION">Skill Certificate</option>
                    <option value="INSURANCE">Insurance Policy</option>
                    <option value="OTHER">Other Credential</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Expiry Date (if any)
                  </label>
                  <input
                    type="date"
                    value={uploadData.expiryDate}
                    onChange={(e) => setUploadData({ ...uploadData, expiryDate: e.target.value })}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Select File *
                </label>
                <input
                  type="file"
                  required
                  onChange={handleFileUploadChange}
                  className="input"
                  style={{ width: '100%', padding: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Upload & Seal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && (
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
            if (e.target === e.currentTarget) setShowVerifyModal(null);
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Verify Statutory Document
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Confirm verification for: <strong>{showVerifyModal.title || showVerifyModal.fileName}</strong>
            </p>

            <form onSubmit={handleVerifySubmit}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setVerifyStatus('VERIFIED')}
                  className={verifyStatus === 'VERIFIED' ? 'btn-primary' : 'btn-secondary'}
                  style={{ flex: 1 }}
                >
                  Mark Verified
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyStatus('REJECTED')}
                  className={verifyStatus === 'REJECTED' ? 'btn-danger' : 'btn-secondary'}
                  style={{ flex: 1 }}
                >
                  Reject
                </button>
              </div>

              {verifyStatus === 'REJECTED' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Rejection Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Expired ID, blurry scan"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="input"
                    style={{ width: '100%', height: '36px' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowVerifyModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionsModal && (
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
            if (e.target === e.currentTarget) setShowVersionsModal(null);
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '540px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Version Audit History
              </h3>
              <button onClick={() => setShowVersionsModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {versions.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                Only the initial sealed version exists for this document.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {versions.map((v, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>Version {v.versionNumber || i + 1}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.fileName} • {new Date(v.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      SHA: {v.checksumSha256?.slice(0, 10)}...
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
