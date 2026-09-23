'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { reportsApi } from '../../../lib/phase5-api';
import { 
  BarChart3, Download, FileSpreadsheet, Filter, 
  Calendar, Building2, ShieldCheck, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';
import { PageHeader, DataTable, Column } from '../../../components/ui';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('EMPLOYEE_MASTER');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportTypes = [
    { id: 'EMPLOYEE_MASTER', name: 'Workforce Roster & Identity', desc: 'Active employees, designations, joined dates, masked bank info' },
    { id: 'CLIENT_SUMMARY', name: 'Client Account Summary', desc: 'Clients, active operating sites, contracts, and contacts' },
    { id: 'OPERATIONS_DEPLOYMENT', name: 'Operational Deployments', desc: 'Assigned personnel per site, shift types, start & end dates' },
    { id: 'PAYROLL_REGISTER', name: 'Monthly Payroll Register', desc: 'Gross earnings, PF, ESI, PT, LWF deductions & net payout' },
    { id: 'BILLING_INVOICE', name: 'Client Billing & Collections', desc: 'Invoices raised, GST breakout, received payments & balance' },
    { id: 'COMPLIANCE_STATUS', name: 'Statutory Compliance Audit', desc: 'All documents, credentials, verification state & expiry tracking' },
  ];

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.generateReport({
        reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        setError(res.error?.message || 'Failed to generate report');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await reportsApi.exportReport({
        reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res.success && res.data?.csvContent) {
        const blob = new Blob([res.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.data.filename || `${reportType}_report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setError(res.error?.message || 'Failed to export CSV');
      }
    } catch (err: any) {
      setError(err.message || 'Error exporting CSV');
    } finally {
      setExporting(false);
    }
  };

  const records = reportData?.records || [];
  const columnKeys = records.length > 0 ? Object.keys(records[0]) : [];

  const columns: Column<any>[] = columnKeys.map((k) => ({
    key: k,
    header: k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
    render: (row) => {
      const val = row[k];
      return (
        <span style={{ fontSize: '0.8125rem' }}>
          {val === null || val === undefined ? '—' : String(val)}
        </span>
      );
    },
  }));

  return (
    <DashboardLayout>
      <PageHeader
        title="Business Intelligence & Regulatory Reporting"
        subtitle="Audit-ready statutory and operational reporting with PII masking and instant CSV export"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports' },
        ]}
        action={
          <button
            onClick={handleExportCsv}
            disabled={exporting || records.length === 0}
            className="btn-secondary"
          >
            <Download size={15} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        }
      />

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

      {/* Domain Selection Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {reportTypes.map((rt) => {
          const isSelected = reportType === rt.id;
          return (
            <div
              key={rt.id}
              onClick={() => {
                setReportType(rt.id);
                setReportData(null);
              }}
              className="card card-interactive"
              style={{
                padding: '16px',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)',
                background: isSelected ? 'var(--accent-blue-bg)' : '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? 'var(--accent-blue-text)' : 'var(--text-primary)' }}>
                  {rt.name}
                </span>
                {isSelected && <CheckCircle2 size={15} style={{ color: 'var(--accent-blue)' }} />}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {rt.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Query Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Start Date (Optional)
          </label>
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: '180px', height: '36px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            End Date (Optional)
          </label>
          <input
            type="date"
            className="input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: '180px', height: '36px' }}
          />
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="btn-primary"
          style={{ height: '36px' }}
        >
          <FileText size={15} />
          {loading ? 'Compiling Report...' : 'Generate Report'}
        </button>
      </div>

      {/* Report Data Preview Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Report Preview: {reportType}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
              {records.length} record(s) returned · Masked PII applied
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={records}
          loading={loading}
          error={error}
          onRetry={handleGenerateReport}
          emptyTitle="No Data Generated"
          emptyDescription="Select a report type and click 'Generate Report' to preview the results."
        />
      </div>
    </DashboardLayout>
  );
}
