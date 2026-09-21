'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getRoleDashboardUrl } from '@/lib/auth/roles';
import type { UserRole } from '@/types/database.types';
import styles from '../auth.module.css';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Sign up with Supabase Auth including role in user metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setErrorMessage(signUpError.message);
        setLoading(false);
        return;
      }

      const user = authData.user;
      if (!user) {
        setErrorMessage('Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      // 2. Ensure record exists in public.users table
      // (Trigger handles it automatically, but we ensure existence with selected role)
      const { data: existingProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        await supabase.from('users').upsert({
          id: user.id,
          email,
          full_name: fullName || null,
          role,
        });
      }

      // 3. If session is immediately active (e.g. Email Confirmations disabled)
      if (authData.session) {
        // Query users table for confirmed role
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        const activeRole: UserRole = profile?.role ?? role;
        const targetDashboard = getRoleDashboardUrl(activeRole);
        router.push(targetDashboard);
        router.refresh();
      } else {
        // Email confirmation is required by Supabase project settings
        setSuccessMessage('Account registered successfully! Please check your email to confirm your account, then log in.');
        setLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Join ShopSphere as a Customer or Seller</p>

        {errorMessage && <div className={styles.errorAlert}>{errorMessage}</div>}
        {successMessage && <div className={styles.successAlert}>{successMessage}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              className={styles.input}
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

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
              minLength={6}
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <span className={styles.label}>Select Your Role</span>
            <div className={styles.roleGroup}>
              <label className={`${styles.roleCard} ${role === 'customer' ? styles.roleCardActive : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="customer"
                  checked={role === 'customer'}
                  onChange={() => setRole('customer')}
                  className={styles.radioInput}
                />
                Customer (Buyer)
              </label>

              <label className={`${styles.roleCard} ${role === 'seller' ? styles.roleCardActive : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="seller"
                  checked={role === 'seller'}
                  onChange={() => setRole('seller')}
                  className={styles.radioInput}
                />
                Seller (Merchant)
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.buttonPrimary}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{' '}
          <Link href="/login" className={styles.link}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
