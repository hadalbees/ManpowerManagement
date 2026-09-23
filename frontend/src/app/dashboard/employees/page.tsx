'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/DashboardLayout';
import { employeesApi, EmployeeItem, DesignationItem } from '../../../lib/employees-api';
import { useAuth } from '../../../context/AuthContext';
import { 
  Users, Plus, Search, Filter, Eye, Edit3, 
  Phone, MapPin, Briefcase, Car, ShieldAlert
} from 'lucide-react';
import { PageHeader, StatusBadge, DataTable, Column } from '../../../components/ui';

export default function EmployeesListPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [designations, setDesignations] = useState<DesignationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const canCreate = user?.role?.slug === 'super-admin' || user?.effectivePermissions?.includes('EMPLOYEE_CREATE');
  const canUpdate = user?.role?.slug === 'super-admin' || user?.effectivePermissions?.includes('EMPLOYEE_UPDATE');

  const fetchDesignations = async () => {
    try {
      const res = await employeesApi.getDesignations();
      if (res.success && res.data) {
        setDesignations(res.data);
      }
    } catch (err) {
      console.error('Error fetching designations:', err);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeesApi.getEmployees({
        search: search.trim() || undefined,
        status: statusFilter,
        designationId: designationFilter !== 'ALL' ? designationFilter : undefined,
        page,
        limit: 10,
      });

      if (res.success && res.data) {
        setEmployees(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        setError(res.error?.message || 'Failed to fetch employees');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page, statusFilter, designationFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  const columns: Column<EmployeeItem>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (emp) => {
        const fullName = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ');
        const initials = (emp.firstName[0] + (emp.lastName ? emp.lastName[0] : '')).toUpperCase();

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
                color: 'var(--text-primary)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fullName}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'var(--accent-blue-text)',
                    background: 'var(--accent-blue-bg)',
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-xs)',
                    fontWeight: 600,
                  }}
                >
                  {emp.employeeCode}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Joined: {new Date(emp.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'designation',
      header: 'Designation & Category',
      render: (emp) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
            {emp.designation?.name || 'Unassigned'}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                textTransform: 'capitalize',
              }}
            >
              {emp.employmentType ? emp.employmentType.toLowerCase().replace('_', ' ') : 'Regular'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {emp.gender ? emp.gender.toLowerCase() : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Branch & Phone',
      render: (emp) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem' }}>
            <Phone size={13} style={{ color: 'var(--text-muted)' }} />
            <span>{emp.phone}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            <MapPin size={12} />
            <span>{emp.branch?.branchName || 'Main Branch'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'driver',
      header: 'Fleet Credentials',
      render: (emp) => {
        const isDriver = Boolean(emp.drivingLicenseNumber);
        return isDriver ? (
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                background: 'var(--accent-blue-bg)',
                color: 'var(--accent-blue-text)',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}
            >
              <Car size={12} /> DL Verified
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {emp.drivingLicenseClass || 'Commercial'}
            </div>
          </div>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Standard</span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (emp) => <StatusBadge status={emp.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (emp) => (
        <div style={{ display: 'inline-flex', gap: '6px' }}>
          <Link
            href={`/dashboard/employees/${emp.id}`}
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
              href={`/dashboard/employees/${emp.id}/edit`}
              className="btn-secondary"
              style={{
                padding: '5px 8px',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Edit Employee"
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
        title="Employee Directory"
        subtitle="Workforce master roster, verified qualifications, deployment readiness, and statutory identities"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Employees' },
        ]}
        action={
          canCreate ? (
            <Link
              href="/dashboard/employees/new"
              className="btn-primary"
            >
              <Plus size={16} />
              Onboard Employee
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
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by employee name, code, phone..."
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

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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
              style={{ width: '130px', height: '38px', padding: '6px 10px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Briefcase size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Role:</span>
            <select
              value={designationFilter}
              onChange={(e) => {
                setDesignationFilter(e.target.value);
                setPage(1);
              }}
              className="input"
              style={{ width: '150px', height: '38px', padding: '6px 10px' }}
            >
              <option value="ALL">All Roles</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        error={error}
        onRetry={fetchEmployees}
        pagination={{
          page,
          totalPages,
          totalItems: totalCount,
          limit: 10,
          onPageChange: (newPage) => setPage(newPage),
        }}
        emptyTitle="No Employees Found"
        emptyDescription={
          search || statusFilter !== 'ALL' || designationFilter !== 'ALL'
            ? 'No employees match your current search and filter criteria.'
            : 'Get started by onboarding your first employee into this branch.'
        }
        emptyAction={
          canCreate ? (
            <Link href="/dashboard/employees/new" className="btn-primary">
              <Plus size={15} /> Onboard Employee
            </Link>
          ) : undefined
        }
      />
    </DashboardLayout>
  );
}
