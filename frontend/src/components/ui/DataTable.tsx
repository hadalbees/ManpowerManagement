'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle } from 'lucide-react';
import EmptyState from './EmptyState';
import { TableSkeleton } from './LoadingSkeleton';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface PaginationConfig {
  page: number;
  totalPages: number;
  totalItems?: number;
  limit?: number;
  onPageChange: (newPage: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  pagination?: PaginationConfig;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  error = null,
  onRetry,
  pagination,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data to display.',
  emptyAction,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={pagination?.limit || 5} columns={columns.length} />;
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          borderColor: 'var(--accent-rose-border)',
          background: 'var(--accent-rose-bg)',
        }}
      >
        <div style={{ display: 'inline-flex', color: 'var(--accent-rose-text)', marginBottom: '12px' }}>
          <AlertCircle size={28} />
        </div>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-rose-text)', marginBottom: '4px' }}>
          Failed to load data
        </h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {error}
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-secondary" style={{ fontSize: '0.8125rem' }}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '12px 16px',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    textAlign: col.align || 'left',
                    width: col.width,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const key = rowKey ? rowKey(row, index) : row.id || index;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{
                    borderBottom: index === data.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                    transition: 'background-color 0.12s ease',
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '13px 16px',
                        color: 'var(--text-primary)',
                        textAlign: col.align || 'left',
                        verticalAlign: 'middle',
                      }}
                    >
                      {col.render ? col.render(row, index) : (row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            Showing Page <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pagination.page}</span> of{' '}
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pagination.totalPages || 1}</span>
            {pagination.totalItems !== undefined && (
              <span> ({pagination.totalItems} total records)</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(1)}
              style={{ padding: '5px 8px' }}
              title="First Page"
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              style={{ padding: '5px 8px' }}
              title="Previous Page"
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ padding: '0 8px', fontWeight: 600 }}>
              {pagination.page}
            </span>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              style={{ padding: '5px 8px' }}
              title="Next Page"
            >
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              style={{ padding: '5px 8px' }}
              title="Last Page"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
