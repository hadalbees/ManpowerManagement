'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, isLoading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#f43f5e', marginBottom: '8px' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You do not have the required permission ({requiredPermission}) to view this resource.</p>
      </div>
    );
  }

  return <>{children}</>;
}
