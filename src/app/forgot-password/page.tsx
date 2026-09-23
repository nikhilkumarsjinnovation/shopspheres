'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from '../auth.module.css';

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
        `A password reset link has been sent to ${email}. Please check your email inbox (and spam folder) and click the link to set a new password.`
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
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {successMessage && <div className={styles.successAlert}>{successMessage}</div>}
        {errorMessage && <div className={styles.errorAlert}>{errorMessage}</div>}

        {!successMessage ? (
          <form onSubmit={handleResetRequest} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">
                Account Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className={styles.buttonPrimary}>
              {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#737373', marginBottom: '1.25rem' }}>
              Didn&apos;t receive an email? Check your spam folder or try again with a different email.
            </p>
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null);
                setEmail('');
              }}
              className={styles.buttonGoogle}
            >
              Try Another Email
            </button>
          </div>
        )}

        <p className={styles.footerText}>
          Remember your password?{' '}
          <Link href="/login" className={styles.link}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
