'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import {
  getDeployments,
  DeploymentItem,
  DeploymentStatus,
} from '../../../lib/deployments-api';
import { useAuth } from '../../../context/AuthContext';
import {
  UserCheck,
  Plus,
  Search,
  Building2,
  MapPin,
  Truck,
  Clock,
  Eye,
  RefreshCw,
  Filter
} from 'lucide-react';
import { PageHeader, StatusBadge, DataTable, Column } from '../../../components/ui';

export default function DeploymentsDirectoryPage() {
  const { user } = useAuth();
  const [deployments, setDeployments] = useState<DeploymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const canCreate = user?.role?.slug === 'super-admin' || user?.effectivePermissions?.includes('DEPLOYMENT_CREATE');

  const fetchDeployments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDeployments({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as DeploymentStatus) : undefined,
        activeOnly: statusFilter === 'ALL' ? activeOnly : undefined,
        page,
        limit: 10,
      });

      if (res.success && res.data) {
        setDeployments(res.data.items || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      } else {
        setError(res.error?.message || 'Failed to load deployments');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to deployment engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, [search, statusFilter, activeOnly, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDeployments();
  };

  const columns: Column<DeploymentItem>[] = [
    {
      key: 'employee',
      header: 'Deployed Personnel',
      render: (dep) => {
        const emp = dep.employee;
        const fullName = emp ? [emp.firstName, emp.lastName].filter(Boolean).join(' ') : 'Personnel';
        const initials = emp ? (emp.firstName[0] + (emp.lastName ? emp.lastName[0] : '')).toUpperCase() : 'EMP';

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: 'var(--accent-blue-text)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fullName}</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-elevated)',
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-xs)',
                    fontWeight: 600,
                  }}
                >
                  {emp?.employeeCode}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {dep.designation?.name || 'Assigned Staff'}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'client',
      header: 'Client & Operating Site',
      render: (dep) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
            <span>{dep.client?.companyName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            <MapPin size={12} />
            <span>{dep.clientSite?.siteName} ({dep.clientSite?.city || 'HQ'})</span>
          </div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Shift & Date Range',
      render: (dep) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            <Clock size={12} style={{ color: 'var(--text-muted)' }} />
            <span>{dep.shiftName || (dep.isNightShift ? 'NIGHT' : 'DAY')} ({dep.shiftStartTime?.slice(0, 5)} - {dep.shiftEndTime?.slice(0, 5)})</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {new Date(dep.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            {dep.endDate ? ` → ${new Date(dep.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ' (Ongoing)'}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Assigned Fleet',
      render: (dep) => {
        if (!dep.vehicle) return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Truck size={14} style={{ color: 'var(--accent-blue)' }} />
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {dep.vehicle.vehicleRegistrationNumber}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {dep.vehicle.vehicleMake} {dep.vehicle.vehicleModel}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'replacement',
      header: 'Substitution',
      render: (dep) => {
        if ((dep as any).isReplacement) {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 7px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--accent-amber-bg)',
                color: 'var(--accent-amber-text)',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={11} /> Standby Sub
            </span>
          );
        }
        return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Original</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (dep) => <StatusBadge status={dep.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (dep) => (
        <Link
          href={`/dashboard/deployments/${dep.id}`}
          className="btn-secondary"
          style={{
            padding: '5px 10px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Eye size={13} /> View
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Deployments Roster"
        subtitle="Workforce site dispatches, shift schedules, temporal constraints, and standby substitutions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Deployments' },
        ]}
        action={
          canCreate ? (
            <Link href="/dashboard/deployments/new" className="btn-primary">
              <Plus size={16} /> Create Deployment
            </Link>
          ) : null
        }
      />

      {/* Search & Filter Toolbar */}
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by personnel, client, site, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '36px', width: '100%', height: '38px' }}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ height: '38px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input"
              style={{ width: '140px', height: '38px', padding: '6px 10px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="TERMINATED">Terminated</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => {
                setActiveOnly(e.target.checked);
                setPage(1);
              }}
              style={{ cursor: 'pointer' }}
            />
            Active Only
          </label>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        columns={columns}
        data={deployments}
        loading={loading}
        error={error}
        onRetry={fetchDeployments}
        pagination={{
          page,
          totalPages,
          totalItems: totalCount,
          limit: 10,
          onPageChange: (newPage) => setPage(newPage),
        }}
        emptyTitle="No Deployments Found"
        emptyDescription={
          search || statusFilter !== 'ALL'
            ? 'No deployments match your filter criteria.'
            : 'Dispatch your first personnel to an active client operating site.'
        }
        emptyAction={
          canCreate ? (
            <Link href="/dashboard/deployments/new" className="btn-primary">
              <Plus size={15} /> Create Deployment
            </Link>
          ) : undefined
        }
      />
    </DashboardLayout>
  );
}
