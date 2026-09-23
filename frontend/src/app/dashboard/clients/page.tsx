'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import { clientsApi, ClientItem } from '../../../lib/clients-api';
import { useAuth } from '../../../context/AuthContext';
import { 
  Building2, Plus, Search, Filter, Eye, Edit3, 
  Phone, Mail, MapPin, Building
} from 'lucide-react';
import { PageHeader, StatusBadge, DataTable, Column } from '../../../components/ui';

export default function ClientsListPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const canCreate = user?.role?.slug === 'super-admin' || user?.effectivePermissions?.includes('CLIENT_CREATE');
  const canUpdate = user?.role?.slug === 'super-admin' || user?.effectivePermissions?.includes('CLIENT_UPDATE');

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientsApi.getClients({
        search: search.trim() || undefined,
        status: statusFilter,
        page,
        limit: 10,
      });

      if (res.success && res.data) {
        setClients(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        setError(res.error?.message || 'Failed to fetch clients');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClients();
  };

  const columns: Column<ClientItem>[] = [
    {
      key: 'client',
      header: 'Company / Organization',
      render: (client) => (
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
              color: 'var(--accent-blue)',
              flexShrink: 0,
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{client.companyName}</div>
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
                {client.clientCode}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {client.legalName || 'Corporate Enterprise'}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Primary Contact',
      render: (client) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
            {client.contactPersonName || 'Authorized Officer'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            <Phone size={11} /> {client.contactPhone || '—'}
          </div>
          {client.contactEmail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              <Mail size={11} /> {client.contactEmail}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'tax',
      header: 'GSTIN / Billing Scope',
      render: (client) => (
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {client.gstin || 'UNREGISTERED'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {client.stateCode ? `State Jurisdiction: ${client.stateCode}` : 'Standard Domestic'}
          </div>
        </div>
      ),
    },
    {
      key: 'sites',
      header: 'Active Sites',
      render: (client: any) => {
        const count = client.clientSites?.length || client._count?.clientSites || 0;
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--bg-elevated)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <MapPin size={12} style={{ color: 'var(--accent-blue)' }} />
            {count} {count === 1 ? 'Site' : 'Sites'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (client) => <StatusBadge status={client.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (client) => (
        <div style={{ display: 'inline-flex', gap: '6px' }}>
          <Link
            href={`/dashboard/clients/${client.id}`}
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
          {canUpdate && (
            <Link
              href={`/dashboard/clients/${client.id}/edit`}
              className="btn-secondary"
              style={{
                padding: '5px 8px',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Edit Client"
            >
              <Edit3 size={13} />
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Client Directory"
        subtitle="Corporate enterprise clients, operating branch sites, active service contracts, and commercial models"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clients' },
        ]}
        action={
          canCreate ? (
            <Link
              href="/dashboard/clients/new"
              className="btn-primary"
            >
              <Plus size={16} />
              Add Client
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
              placeholder="Search by company name, client code, GSTIN..."
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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
            <option value="INACTIVE">Inactive</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        columns={columns}
        data={clients}
        loading={loading}
        error={error}
        onRetry={fetchClients}
        pagination={{
          page,
          totalPages,
          totalItems: totalCount,
          limit: 10,
          onPageChange: (newPage) => setPage(newPage),
        }}
        emptyTitle="No Clients Found"
        emptyDescription={
          search || statusFilter !== 'ALL'
            ? 'No clients match your filter criteria.'
            : 'Add your first enterprise corporate client account.'
        }
        emptyAction={
          canCreate ? (
            <Link href="/dashboard/clients/new" className="btn-primary">
              <Plus size={15} /> Add New Client
            </Link>
          ) : undefined
        }
      />
    </DashboardLayout>
  );
}
