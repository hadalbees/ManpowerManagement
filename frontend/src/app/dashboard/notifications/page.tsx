'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { notificationsApi } from '../../../lib/phase5-api';
import { 
  Bell, Check, CheckCheck, Filter, AlertTriangle, 
  Info, AlertCircle, Clock, ShieldCheck
} from 'lucide-react';
import { PageHeader, StatusBadge, EmptyState } from '../../../components/ui';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.getNotifications({
          isRead: unreadOnly ? false : undefined,
          priority: priorityFilter || undefined,
          category: categoryFilter || undefined,
          page,
          limit: 15,
        }),
        notificationsApi.getUnreadCount(),
      ]);

      if (listRes.success && listRes.data) {
        setNotifications(listRes.data.items || []);
        setTotalPages(listRes.data.totalPages || 1);
      }
      if (countRes.success && countRes.data) {
        setUnreadCount(countRes.data.unreadCount || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, unreadOnly, priorityFilter, categoryFilter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await notificationsApi.markAsRead(id);
      if (res.success) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await notificationsApi.markAllAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const categories = [
    { id: '', label: 'All Categories' },
    { id: 'PAYROLL', label: 'Payroll' },
    { id: 'COMPLIANCE', label: 'Compliance' },
    { id: 'DOCUMENT', label: 'Documents' },
    { id: 'DEPLOYMENT', label: 'Deployment' },
    { id: 'LEAVE', label: 'Leave' },
    { id: 'RECRUITMENT', label: 'Recruitment' },
    { id: 'BILLING', label: 'Billing' },
    { id: 'SYSTEM', label: 'System' },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Notification Center"
        subtitle="Operational event feed, statutory alerts, supervisor approval requests, and system advisories"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Notifications' },
        ]}
        action={
          unreadCount > 0 ? (
            <button onClick={handleMarkAllAsRead} className="btn-secondary">
              <CheckCheck size={15} /> Mark All as Read ({unreadCount})
            </button>
          ) : undefined
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
            fontSize: '0.84rem',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {/* Category Tabs & Filter Bar */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', alignItems: 'center' }}>
          {categories.map((c) => {
            const isSelected = categoryFilter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setCategoryFilter(c.id);
                  setPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--accent-blue-border)' : 'transparent',
                  background: isSelected ? 'var(--accent-blue-bg)' : 'transparent',
                  color: isSelected ? 'var(--accent-blue-text)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="input"
            style={{ width: '130px', height: '34px', padding: '4px 8px' }}
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
              style={{ cursor: 'pointer' }}
            />
            Unread Only
          </label>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading notification feed...
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No Notifications"
            description="Your inbox is completely clear. Operational alerts will appear here as they occur."
            icon={Bell}
          />
        ) : (
          <div>
            {notifications.map((n, idx) => (
              <div
                key={n.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: idx === notifications.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                  background: n.isRead ? '#ffffff' : 'var(--accent-blue-bg)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'background-color 0.12s ease',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-sm)',
                      background: n.isRead ? 'var(--bg-elevated)' : '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: n.priority === 'CRITICAL' ? 'var(--accent-rose-text)' : 'var(--accent-blue)',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Bell size={15} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontWeight: n.isRead ? 500 : 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      <StatusBadge
                        status={n.priority === 'CRITICAL' ? 'EXPIRED' : n.priority === 'HIGH' ? 'PENDING' : 'DRAFT'}
                        label={n.priority || 'NORMAL'}
                        size="sm"
                      />
                      {n.category && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 'var(--radius-xs)' }}>
                          {n.category}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '2px 0 6px' }}>
                      {n.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <Clock size={11} />
                      <span>{new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.72rem', flexShrink: 0 }}
                  >
                    <Check size={12} /> Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
