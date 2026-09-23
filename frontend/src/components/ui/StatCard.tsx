'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  trend?: {
    value: string | number;
    positive?: boolean;
    neutral?: boolean;
    label?: string;
  };
  accentColor?: string;
  badge?: React.ReactNode;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  subtext,
  trend,
  accentColor = '#2563eb',
  badge,
}: StatCardProps) {
  return (
    <div
      className="card card-interactive"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        minHeight: '124px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <span style={{ 
            fontSize: '0.8125rem', 
            fontWeight: 500, 
            color: 'var(--text-secondary)',
            letterSpacing: '0.01em',
            textTransform: 'uppercase'
          }}>
            {title}
          </span>
          <div style={{ 
            fontSize: '1.625rem', 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            letterSpacing: '-0.02em', 
            marginTop: '4px',
            lineHeight: 1.2
          }}>
            {value}
          </div>
        </div>

        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
            flexShrink: 0,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', gap: '8px' }}>
        {trend && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: trend.neutral 
                ? 'var(--text-muted)' 
                : trend.positive 
                ? 'var(--accent-emerald-text)' 
                : 'var(--accent-rose-text)',
            }}
          >
            {trend.neutral ? null : trend.positive ? (
              <TrendingUp size={13} />
            ) : (
              <TrendingDown size={13} />
            )}
            <span>{trend.value}</span>
            {trend.label && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{trend.label}</span>
            )}
          </div>
        )}

        {subtext && !trend && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {subtext}
          </span>
        )}

        {badge && <div>{badge}</div>}
      </div>
    </div>
  );
}
