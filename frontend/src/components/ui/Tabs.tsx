'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {Icon && <Icon size={16} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  background: isActive ? 'var(--accent-blue-bg)' : 'var(--bg-elevated)',
                  color: isActive ? 'var(--accent-blue-text)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
