'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { 
  Lock, Mail, Eye, EyeOff, AlertCircle, 
  CheckCircle2, Loader2, ArrowRight, Layers
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, agencySettings } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 600);
      } else {
        setErrorMessage(result.error || 'Authentication failed');
        setErrorCode(result.code || 'AUTH_ERROR');
      }
    } catch (err: any) {
      setErrorMessage('A network communication error occurred. Please try again.');
      setErrorCode('NETWORK_ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-primary)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: agencySettings?.logoUrl ? '60px' : '48px',
              height: agencySettings?.logoUrl ? '60px' : '48px',
              borderRadius: 'var(--radius-md)',
              background: agencySettings?.logoUrl ? '#ffffff' : 'var(--primary-charcoal)',
              border: agencySettings?.logoUrl ? '1px solid var(--border-subtle)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '14px',
              overflow: 'hidden',
              padding: agencySettings?.logoUrl ? '6px' : '0',
            }}
          >
            {agencySettings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agencySettings.logoUrl} alt="Agency Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <Layers size={24} />
            )}
          </div>
          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            {agencySettings?.companyName || 'Apex Manpower ERP'}
          </h1>
          <p
            style={{
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            {agencySettings?.location || 'Enterprise Workforce & Operations Platform'}
          </p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: '28px', boxShadow: 'var(--shadow-md)' }}>
          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                marginBottom: '18px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-rose-bg)',
                border: '1px solid var(--accent-rose-border)',
                color: 'var(--accent-rose-text)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.84rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontWeight: 600 }}>
                  {errorCode === 'AUTH_ACCOUNT_LOCKED'
                    ? 'Account Locked'
                    : errorCode === 'NETWORK_ERROR'
                    ? 'Connection Error'
                    : 'Authentication Failed'}
                </strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && (
            <div
              style={{
                marginBottom: '18px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-emerald-bg)',
                border: '1px solid var(--accent-emerald-border)',
                color: 'var(--accent-emerald-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.84rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Authentication successful. Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                Work Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  disabled={isLoading || isSuccess}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@apexmanpower.in"
                  className="input"
                  style={{
                    width: '100%',
                    paddingLeft: '38px',
                    height: '40px',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading || isSuccess}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input"
                  style={{
                    width: '100%',
                    paddingLeft: '38px',
                    paddingRight: '38px',
                    height: '40px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label
                htmlFor="rememberMe"
                style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Keep this device authenticated
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Signing In...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Authenticated</span>
                </>
              ) : (
                <>
                  <span>Sign In to Agency Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
