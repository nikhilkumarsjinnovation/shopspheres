'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes('rate limit') ||
          (error as { code?: string }).code === 'over_email_send_rate_limit'
        ) {
          setErrorMessage(
            'Email rate limit reached: Supabase limits default verification/recovery emails to ~3/hour. Please try again later or configure custom SMTP in Supabase.'
          );
        } else {
          setErrorMessage(error.message);
        }
        setLoading(false);
        return;
      }

      setSuccessMessage(
        `A password reset link has been sent to ${email}. Please check your email inbox and click the link to set a new password.`
      );
      setLoading(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while requesting password reset.';
      setErrorMessage(message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card animate-slide-up">
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="brand-mark" style={{ width: '36px', height: '36px', fontSize: '1.1rem', margin: '0 auto 1rem' }}>
            S
          </div>
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Enter your email and we&apos;ll send you a recovery link
          </p>
        </div>

        {successMessage && (
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--success)',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: '1.5rem',
            }}
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: '1.5rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        {!successMessage ? (
          <form onSubmit={handleResetRequest}>
            <div className="auth-form-group">
              <label htmlFor="email" className="auth-label">
                Account Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary-auth" disabled={loading}>
              {loading ? 'Sending Recovery Link...' : 'Send Recovery Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1.25rem' }}>
              Didn&apos;t receive an email? Check your spam folder or try again with a different email.
            </p>
            <button
              type="button"
              className="btn-card-toggle"
              style={{ width: '100%', justifyContent: 'center', height: '2.6rem' }}
              onClick={() => {
                setSuccessMessage(null);
                setEmail('');
              }}
            >
              Try Another Email
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
          Remember your password?{' '}
          <Link href="/login" style={{ color: 'var(--fg-primary)', fontWeight: 600, textDecoration: 'underline' }}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
