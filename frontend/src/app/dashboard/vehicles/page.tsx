'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import { 
  vehiclesApi, VehicleItem, VehicleTypeOption 
} from '../../../lib/vehicles-api';
import { useAuth } from '../../../context/AuthContext';
import { 
  Truck, Plus, Search, Filter, Eye, Edit3, 
  User, Fuel, Gauge, Building2, Wrench
} from 'lucide-react';
import { PageHeader, StatusBadge, DataTable, Column } from '../../../components/ui';

export default function VehiclesListPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [types, setTypes] = useState<VehicleTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const canCreate = user?.role?.slug === 'super-admin' || user?.effectivePermissions?.includes('VEHICLE_CREATE');
  const canUpdate = user?.role?.slug === 'super-admin' || user?.effectivePermissions?.includes('VEHICLE_UPDATE');

  const fetchMetadata = async () => {
    try {
      const res = await vehiclesApi.getVehicleTypes();
      if (res.success && res.data) {
        setTypes(res.data);
      }
    } catch (err) {
      console.error('Error fetching vehicle types:', err);
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vehiclesApi.getVehicles({
        search: search.trim() || undefined,
        status: statusFilter,
        vehicleType: typeFilter,
        page,
        limit: 10,
      });

      if (res.success && res.data) {
        setVehicles(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        setError(res.error?.message || 'Failed to fetch vehicles');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [page, statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVehicles();
  };

  const columns: Column<VehicleItem>[] = [
    {
      key: 'vehicle',
      header: 'Vehicle & Registration',
      render: (veh) => (
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
            <Truck size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              {veh.vehicleRegistrationNumber}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {veh.vehicleMake} {veh.vehicleModel} ({veh.manufacturingYear || 'Standard'})
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type & Fuel',
      render: (veh) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
            {veh.vehicleType?.replace(/_/g, ' ')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            <Fuel size={12} />
            <span>{veh.fuelType || 'DIESEL'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'driver',
      header: 'Assigned Driver',
      render: (veh) => {
        if (veh.currentAssignment?.employee) {
          const d = veh.currentAssignment.employee;
          const name = [d.firstName, d.lastName].filter(Boolean).join(' ');
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                <User size={12} style={{ color: 'var(--accent-blue)' }} />
                <span>{name}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Code: {d.employeeCode}
              </div>
            </div>
          );
        }
        return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unassigned (In Depot)</span>;
      },
    },
    {
      key: 'odometer',
      header: 'Odometer & Branch',
      render: (veh) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            <Gauge size={12} style={{ color: 'var(--text-muted)' }} />
            <span>{(veh.currentOdometerKm || 0).toLocaleString()} km</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {veh.branch?.branchName || 'Main Hub'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (veh) => <StatusBadge status={veh.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (veh) => (
        <div style={{ display: 'inline-flex', gap: '6px' }}>
          <Link
            href={`/dashboard/vehicles/${veh.id}`}
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
              href={`/dashboard/vehicles/${veh.id}/edit`}
              className="btn-secondary"
              style={{
                padding: '5px 8px',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Edit Vehicle"
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
        title="Fleet Management"
        subtitle="Commercial vehicle registry, active driver allocations, maintenance intervals, and telemetry"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Vehicles & Fleet' },
        ]}
        action={
          canCreate ? (
            <Link href="/dashboard/vehicles/new" className="btn-primary">
              <Plus size={16} /> Register Vehicle
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
              placeholder="Search by reg number, make, model..."
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
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="UNDER_MAINTENANCE">Maintenance</option>
              <option value="DECOMMISSIONED">Decommissioned</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Truck size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="input"
              style={{ width: '150px', height: '38px', padding: '6px 10px' }}
            >
              <option value="ALL">All Types</option>
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        columns={columns}
        data={vehicles}
        loading={loading}
        error={error}
        onRetry={fetchVehicles}
        pagination={{
          page,
          totalPages,
          totalItems: totalCount,
          limit: 10,
          onPageChange: (newPage) => setPage(newPage),
        }}
        emptyTitle="No Vehicles Found"
        emptyDescription={
          search || statusFilter !== 'ALL' || typeFilter !== 'ALL'
            ? 'No vehicles match your filter criteria.'
            : 'Register your first fleet vehicle in this branch.'
        }
        emptyAction={
          canCreate ? (
            <Link href="/dashboard/vehicles/new" className="btn-primary">
              <Plus size={15} /> Register Vehicle
            </Link>
          ) : undefined
        }
      />
    </DashboardLayout>
  );
}
