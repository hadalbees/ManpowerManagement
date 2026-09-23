'use client';

import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '16px',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              height: '14px',
              flex: i === 0 ? '2' : '1',
              borderRadius: 'var(--radius-xs)',
            }}
          />
        ))}
      </div>

      <div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            style={{
              padding: '16px 20px',
              borderBottom: r === rows - 1 ? 'none' : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={c}
                className="skeleton"
                style={{
                  height: '16px',
                  flex: c === 0 ? '2' : '1',
                  borderRadius: 'var(--radius-xs)',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '20px', minHeight: '120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="skeleton" style={{ width: '45%', height: '14px' }} />
            <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)' }} />
          </div>
          <div className="skeleton" style={{ width: '60%', height: '28px', marginBottom: '10px' }} />
          <div className="skeleton" style={{ width: '30%', height: '12px' }} />
        </div>
      ))}
    </div>
  );
}
