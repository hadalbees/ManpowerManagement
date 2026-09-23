'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
  badge,
}: PageHeaderProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            marginBottom: '8px',
          }}
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={13} style={{ color: 'var(--border-medium)' }} />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    style={{
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-blue)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span style={{ color: isLast ? 'var(--text-primary)' : 'inherit', fontWeight: isLast ? 600 : 400 }}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontSize: '1.625rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
              }}
            >
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginTop: '4px',
                maxWidth: '750px',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {action && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
