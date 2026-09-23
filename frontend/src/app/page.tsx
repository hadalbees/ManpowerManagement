'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--border-subtle)',
            borderTopColor: 'var(--primary-500)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px auto',
          }}
        />
        <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Redirecting to Agency Portal...
        </div>
      </div>
    </div>
  );
}
