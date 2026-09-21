'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getRoleDashboardUrl } from '@/lib/auth/roles';
import type { UserRole } from '@/types/database.types';
import styles from '../auth.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const verifiedParam = searchParams.get('verified');

    if (verifiedParam === 'true') {
      setSuccessMessage('Email verified successfully! Please log in to continue.');
    } else if (errorParam === 'account_inactive') {
      setErrorMessage('Your account is deactivated. Please contact support.');
    } else if (errorParam === 'auth_callback_failed') {
      setErrorMessage('Authentication could not be completed. Please try again.');
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setErrorMessage(signInError.message);
        setLoading(false);
        return;
      }

      const user = authData.user;
      if (!user) {
        setErrorMessage('Failed to sign in. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Query public.users table to verify role and status
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        // Fallback to customer if profile has not populated yet
        router.push('/customer/dashboard');
        router.refresh();
        return;
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        setErrorMessage('Your account has been deactivated. Please contact an administrator.');
        setLoading(false);
        return;
      }

      const role: UserRole = profile.role;
      const targetDashboard = getRoleDashboardUrl(role);
      router.push(targetDashboard);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during sign in.';
      setErrorMessage(message);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google OAuth failed to initialize.';
      setErrorMessage(message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Welcome Back</h1>
      <p className={styles.subtitle}>Sign in to your ShopSphere account</p>

      {successMessage && <div className={styles.successAlert}>{successMessage}</div>}
      {errorMessage && <div className={styles.errorAlert}>{errorMessage}</div>}

      <form onSubmit={handleEmailLogin} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="email">Email Address</label>
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

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            className={styles.input}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={styles.buttonPrimary}
        >
          {loading ? 'Signing In...' : 'Log In'}
        </button>
      </form>

      <div className={styles.divider}>Or</div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className={styles.buttonGoogle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        Continue with Google
      </button>

      <p className={styles.footerText}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" className={styles.link}>
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div className={styles.card}><p>Loading sign in...</p></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
