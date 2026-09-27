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
    <div>
      <div>
        <h1>Reset Password</h1>
        <p>
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {successMessage && <div>{successMessage}</div>}
        {errorMessage && <div>{errorMessage}</div>}

        {!successMessage ? (
          <form onSubmit={handleResetRequest}>
            <div>
              <label htmlFor="email">
                Account Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div>
            <p>
              Didn&apos;t receive an email? Check your spam folder or try again with a different email.
            </p>
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null);
                setEmail('');
              }}
            >
              Try Another Email
            </button>
          </div>
        )}

        <p>
          Remember your password?{' '}
          <Link href="/login">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
