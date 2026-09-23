'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../lib/phase5-api';
import { 
  Building2, Users, Truck, UserCheck, CalendarCheck, 
  CalendarDays, RefreshCw, Wallet, FileText, Receipt, 
  CreditCard, FolderLock, ShieldCheck, AlertCircle, 
  UserPlus, Bell, BarChart3, TrendingUp, LogOut, 
  Menu, X, ChevronRight, ChevronLeft, Search, 
  Shield, CheckCircle2, MapPin, Layers, Settings, FileClock
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  permission?: string;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function DashboardLayout({
  children,
  title,
  subtitle,
  action,
  breadcrumbs,
}: DashboardLayoutProps) {
  const { user, logout, hasPermission, agencySettings } = useAuth();
  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Load unread notifications count
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await notificationsApi.getUnreadCount();
        if (res.success && res.data?.unreadCount !== undefined) {
          setUnreadCount(res.data.unreadCount);
        }
      } catch (err) {
        // Soft fail
      }
    }
    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Enterprise navigation taxonomy
  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: Layers },
      ],
    },
    {
      title: 'PEOPLE',
      items: [
        { href: '/dashboard/employees', label: 'Employees', icon: Users, permission: 'EMPLOYEE_READ' },
        { href: '/dashboard/recruitment', label: 'Recruitment', icon: UserPlus, permission: 'RECRUITMENT_READ' },
        { href: '/dashboard/leave', label: 'Leave', icon: CalendarDays, permission: 'LEAVE_READ' },
        { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck, permission: 'ATTENDANCE_READ' },
        { href: '/dashboard/replacements', label: 'Replacements', icon: RefreshCw, permission: 'REPLACEMENT_READ' },
      ],
    },
    {
      title: 'CLIENTS & OPERATIONS',
      items: [
        { href: '/dashboard/clients', label: 'Clients', icon: Building2, permission: 'CLIENT_READ' },
        { href: '/dashboard/deployments', label: 'Deployments', icon: UserCheck, permission: 'DEPLOYMENT_READ' },
        { href: '/dashboard/vehicles', label: 'Vehicles & Fleet', icon: Truck, permission: 'VEHICLE_READ' },
      ],
    },
    {
      title: 'PAYROLL & FINANCE',
      items: [
        { href: '/dashboard/payroll', label: 'Payroll', icon: Wallet, permission: 'PAYROLL_READ' },
        { href: '/dashboard/payslips', label: 'Payslips', icon: FileText, permission: 'PAYSLIP_READ' },
        { href: '/dashboard/billing', label: 'Client Billing', icon: Receipt, permission: 'BILLING_READ' },
        { href: '/dashboard/billing/invoices', label: 'Invoices', icon: FileText, permission: 'BILLING_READ' },
        { href: '/dashboard/billing/payments', label: 'Payments', icon: CreditCard, permission: 'BILLING_READ' },
      ],
    },
    {
      title: 'COMPLIANCE',
      items: [
        { href: '/dashboard/documents', label: 'Documents Vault', icon: FolderLock, permission: 'DOCUMENT_READ' },
        { href: '/dashboard/compliance', label: 'Compliance & Expiry', icon: ShieldCheck, permission: 'COMPLIANCE_READ' },
      ],
    },
    {
      title: 'REPORTS & ANALYTICS',
      items: [
        { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, permission: 'REPORT_READ' },
        { href: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp, permission: 'ANALYTICS_READ' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { 
          href: '/dashboard/notifications', 
          label: 'Notifications', 
          icon: Bell, 
          permission: 'NOTIFICATION_READ',
          badge: unreadCount > 0 ? unreadCount : undefined 
        },
        {
          href: '/dashboard/settings',
          label: 'Admin Settings',
          icon: Settings,
        },
      ],
    },
  ];

  // RBAC filter: only show items user has permission to access
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  // Auto generate breadcrumb if not provided
  const activeBreadcrumbs = breadcrumbs || [
    { label: 'Home', href: '/dashboard' },
    ...(pathname !== '/dashboard'
      ? pathname
          .replace('/dashboard/', '')
          .split('/')
          .map((seg, i, arr) => {
            const href = '/dashboard/' + arr.slice(0, i + 1).join('/');
            const formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
            return { label: formatted, href: i === arr.length - 1 ? undefined : href };
          })
      : []),
  ];

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const sidebarWidth = isCollapsed ? '68px' : '260px';

  return (
    <ProtectedRoute>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex' }}>
        
        {/* Mobile Backdrop */}
        {isMobileOpen && (
          <div
            onClick={() => setIsMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 49,
            }}
          />
        )}

        {/* LEFT SIDEBAR */}
        <aside
          style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            width: sidebarWidth,
            background: '#ffffff',
            borderRight: '1px solid var(--border-subtle)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease',
            transform: typeof window !== 'undefined' && window.innerWidth < 1024
              ? (isMobileOpen ? 'translateX(0)' : 'translateX(-100%)')
              : 'none',
          }}
        >
          {/* Sidebar Header / Brand */}
          <div
            style={{
              height: '60px',
              padding: isCollapsed ? '0 12px' : '0 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <Link
              href="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                color: 'inherit',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-charcoal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
                  overflow: 'hidden',
                }}
              >
                {agencySettings?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agencySettings.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Layers size={18} />
                )}
              </div>

              {!isCollapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                    {agencySettings?.companyName || user?.agency?.name || 'Apex Manpower'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                    {agencySettings?.location || user?.branch?.name || 'Operations & Governance ERP'}
                  </div>
                </div>
              )}
            </Link>

            {/* Collapse toggle on desktop */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Collapse Sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {/* Collapsed Expand Toggle */}
          {isCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '6px',
                  borderRadius: 'var(--radius-xs)',
                }}
                title="Expand Sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Navigation Links List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: isCollapsed ? '12px 6px' : '16px 10px',
            }}
          >
            {visibleSections.map((section, sIdx) => (
              <div key={section.title} style={{ marginBottom: isCollapsed ? '12px' : '18px' }}>
                {!isCollapsed && (
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.05em',
                      padding: '4px 10px',
                      marginBottom: '4px',
                    }}
                  >
                    {section.title}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={isCollapsed ? item.label : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: isCollapsed ? 'center' : 'space-between',
                          padding: isCollapsed ? '9px 0' : '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.84rem',
                          fontWeight: isActive ? 600 : 500,
                          textDecoration: 'none',
                          color: isActive ? 'var(--accent-blue-text)' : 'var(--text-secondary)',
                          background: isActive ? 'var(--accent-blue-bg)' : 'transparent',
                          border: isActive ? '1px solid var(--accent-blue-border)' : '1px solid transparent',
                          transition: 'all 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <Icon size={17} style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)', flexShrink: 0 }} />
                          {!isCollapsed && <span>{item.label}</span>}
                        </div>

                        {!isCollapsed && item.badge !== undefined && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: 'var(--accent-rose-bg)',
                              color: 'var(--accent-rose-text)',
                              padding: '1px 6px',
                              borderRadius: '9999px',
                              border: '1px solid var(--accent-rose-border)',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer: User Context & Logout */}
          <div
            style={{
              padding: isCollapsed ? '12px 6px' : '12px 14px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary-charcoal)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </div>

              {!isCollapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.fullName || 'Administrator'}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {user?.role?.name || 'Staff'}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={() => logout()}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '6px',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease',
                }}
                title="Sign Out"
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-rose-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </aside>

        {/* MAIN APPLICATION AREA */}
        <div
          style={{
            flex: 1,
            marginLeft: typeof window !== 'undefined' && window.innerWidth < 1024 ? 0 : sidebarWidth,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            transition: 'margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* TOP HEADER */}
          <header
            style={{
              height: '60px',
              background: '#ffffff',
              borderBottom: '1px solid var(--border-subtle)',
              position: 'sticky',
              top: 0,
              zIndex: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
            }}
          >
            {/* Left: Mobile Toggle & Breadcrumbs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  background: 'none',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
                aria-label="Open Navigation"
              >
                <Menu size={18} />
              </button>

              <nav
                aria-label="Breadcrumb"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                }}
              >
                {activeBreadcrumbs.map((crumb, idx) => {
                  const isLast = idx === activeBreadcrumbs.length - 1;
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight size={12} style={{ color: 'var(--border-medium)' }} />}
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          style={{
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                          }}
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
            </div>

            {/* Right: Branch Context, Notifications, User Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Branch Context Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}
              >
                <MapPin size={13} style={{ color: 'var(--accent-blue)' }} />
                <span>
                  {user?.branch ? `${user.branch.name} (${user.branch.code})` : (agencySettings?.location || 'All Branches (Agency HQ)')}
                </span>
              </div>

              {/* Notification Bell */}
              <Link
                href="/dashboard/notifications"
                style={{
                  position: 'relative',
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  border: '1px solid var(--border-subtle)',
                  background: '#ffffff',
                }}
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      minWidth: '16px',
                      height: '16px',
                      borderRadius: '8px',
                      background: 'var(--accent-rose)',
                      color: '#ffffff',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                      border: '2px solid #ffffff',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile Dropdown Trigger */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--primary-charcoal)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {userInitials}
                  </div>
                </button>

                {profileDropdownOpen && (
                  <div
                    className="card"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '42px',
                      width: '220px',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '8px 0',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {user?.fullName || 'Administrator'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {user?.email || 'admin@apexmanpower.in'}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--accent-blue-text)', marginTop: '4px', fontWeight: 600 }}>
                        Role: {user?.role?.name || 'Super Admin'}
                      </div>
                    </div>

                    <Link
                      href="/dashboard/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        fontSize: '0.8125rem',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                      Admin Settings
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        background: 'none',
                        border: 'none',
                        borderTop: '1px solid var(--border-subtle)',
                        fontSize: '0.8125rem',
                        color: 'var(--accent-rose-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-rose-bg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MAIN CONTENT VIEW */}
          <main
            style={{
              flex: 1,
              padding: '24px 28px',
              maxWidth: '1440px',
              width: '100%',
              margin: '0 auto',
            }}
          >
            {title && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.25,
                    }}
                  >
                    {title}
                  </h1>
                  {subtitle && (
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        marginTop: '4px',
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>

                {action && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {action}
                  </div>
                )}
              </div>
            )}

            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
