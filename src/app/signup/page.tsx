'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getRoleDashboardUrl } from '@/lib/auth/roles';
import type { UserRole } from '@/types/database.types';
import styles from '../auth.module.css';

type PasswordStrength = 'Weak' | 'Normal' | 'Strong';

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

  // Saksham Accessibility Preferences
  const [wantsAccessibility, setWantsAccessibility] = useState(false);
  const [accessHighContrast, setAccessHighContrast] = useState(false);
  const [accessFontScale, setAccessFontScale] = useState(1.0);
  const [accessLargeTouch, setAccessLargeTouch] = useState(false);
  const [accessSimplifiedUI, setAccessSimplifiedUI] = useState(false);

  // Real-time password evaluation
  const passwordAnalysis = useMemo(() => {
    if (!password) {
      return {
        strength: null as PasswordStrength | null,
        hasMinLength: false,
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasSpecial: false,
        isValid: false,
      };
    }

    const hasMinLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_~-]/.test(password);

    const matchCount = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    let strength: PasswordStrength = 'Weak';

    if (!hasMinLength || matchCount < 2) {
      strength = 'Weak';
    } else if (hasMinLength && matchCount >= 4) {
      strength = 'Strong';
    } else if (hasMinLength && matchCount >= 2) {
      strength = 'Normal';
    }

    const isValid = hasMinLength && strength !== 'Weak';

    return {
      strength,
      hasMinLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid,
    };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Strict client-side security validation
    if (!passwordAnalysis.hasMinLength) {
      setErrorMessage('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (passwordAnalysis.strength === 'Weak') {
      setErrorMessage(
        'Password is too weak. Please combine uppercase letters, lowercase letters, numbers, or special characters.'
      );
      setLoading(false);
      return;
    }

    try {
      const origin = window.location.origin;

      // 1. Sign up with Supabase Auth including role and email verification redirect
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName,
          },
          // Directs verification email click to callback which redirects to /login?verified=true
          emailRedirectTo: `${origin}/auth/callback?verified=true`,
        },
      });

      if (signUpError) {
        if (
          signUpError.message?.toLowerCase().includes('rate limit') ||
          (signUpError as { code?: string }).code === 'over_email_send_rate_limit'
        ) {
          setErrorMessage(
            'Email rate limit reached: Supabase limits default verification emails to ~3/hour. You can disable "Confirm email" in Supabase Dashboard (Authentication > Providers > Email) for instant testing.'
          );
        } else {
          setErrorMessage(signUpError.message);
        }
        setLoading(false);
        return;
      }

      const user = authData.user;
      if (!user) {
        setErrorMessage('Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      // 2. Ensure record exists in public.users table with selected role
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

      // If user enabled accessibility preferences, store profile
      if (wantsAccessibility) {
        await supabase.from('user_accessibility_profiles').upsert({
          user_id: user.id,
          has_disability: true,
          visual_high_contrast: accessHighContrast,
          visual_font_magnification: accessFontScale,
          motor_large_touch_targets: accessLargeTouch,
          cognitive_simplified_ui: accessSimplifiedUI,
        });
      }

      // 3. If session is immediately active (e.g. Email Confirmations disabled)
      if (authData.session) {
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
        setSuccessMessage(
          'Account created successfully! A confirmation link has been sent to your email. Click the link in your email to verify and continue.'
        );
        setLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(message);
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Pass the selected role to callback so the profile is created with customer or seller role
          redirectTo: `${origin}/auth/callback?role=${role}`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign up failed.';
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
            <label className={styles.label} htmlFor="password">Password (min. 8 characters)</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Real-time Password Strength Meter */}
            {password.length > 0 && (
              <div>
                <div className={styles.meterTrack}>
                  <div
                    className={`${styles.meterFill} ${
                      passwordAnalysis.strength === 'Strong'
                        ? styles.meterFillStrong
                        : passwordAnalysis.strength === 'Normal'
                        ? styles.meterFillNormal
                        : styles.meterFillWeak
                    }`}
                  />
                </div>

                <div className={styles.meterHeader}>
                  <span className={styles.meterLabel}>Password Strength:</span>
                  <span
                    className={`${styles.meterBadge} ${
                      passwordAnalysis.strength === 'Strong'
                        ? styles.badgeStrong
                        : passwordAnalysis.strength === 'Normal'
                        ? styles.badgeNormal
                        : styles.badgeWeak
                    }`}
                  >
                    {passwordAnalysis.strength}
                  </span>
                </div>

                <div className={styles.checklist}>
                  <div
                    className={`${styles.checklistItem} ${
                      passwordAnalysis.hasMinLength ? styles.checklistItemValid : ''
                    }`}
                  >
                    <span>{passwordAnalysis.hasMinLength ? '✓' : '•'}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div
                    className={`${styles.checklistItem} ${
                      passwordAnalysis.hasUpper && passwordAnalysis.hasLower
                        ? styles.checklistItemValid
                        : ''
                    }`}
                  >
                    <span>
                      {passwordAnalysis.hasUpper && passwordAnalysis.hasLower ? '✓' : '•'}
                    </span>
                    <span>Uppercase and lowercase letters</span>
                  </div>
                  <div
                    className={`${styles.checklistItem} ${
                      passwordAnalysis.hasNumber || passwordAnalysis.hasSpecial
                        ? styles.checklistItemValid
                        : ''
                    }`}
                  >
                    <span>
                      {passwordAnalysis.hasNumber || passwordAnalysis.hasSpecial ? '✓' : '•'}
                    </span>
                    <span>Numbers or symbols</span>
                  </div>
                </div>
              </div>
            )}
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

          {/* Saksham Accessibility Preferences (Optional) — hidden until the feature is ready */}
          {false && (
          <div
            style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: wantsAccessibility ? '#f0f9ff' : '#f8fafc',
              border: wantsAccessibility ? '1px solid #38bdf8' : '1px solid #e2e8f0',
              marginBottom: '1rem',
              transition: 'all 0.2s',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              <input
                type="checkbox"
                checked={wantsAccessibility}
                onChange={(e) => setWantsAccessibility(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>♿ Enable Saksham Inclusive Accessibility Options</span>
            </label>

            {wantsAccessibility && (
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* High Contrast */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={accessHighContrast}
                    onChange={(e) => setAccessHighContrast(e.target.checked)}
                  />
                  <span>High Contrast Visual Display</span>
                </label>

                {/* Font Scaling */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                  <span>Text Size:</span>
                  <select
                    value={accessFontScale}
                    onChange={(e) => setAccessFontScale(Number(e.target.value))}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  >
                    <option value={1.0}>100% (Standard)</option>
                    <option value={1.25}>125% (Large)</option>
                    <option value={1.5}>150% (Extra Large)</option>
                    <option value={1.75}>175% (Maximum)</option>
                  </select>
                </div>

                {/* Large Touch Targets */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={accessLargeTouch}
                    onChange={(e) => setAccessLargeTouch(e.target.checked)}
                  />
                  <span>Large Touch Targets (Motor Ease)</span>
                </label>

                {/* Simplified UI */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={accessSimplifiedUI}
                    onChange={(e) => setAccessSimplifiedUI(e.target.checked)}
                  />
                  <span>Simplified UI (Focus Assistance)</span>
                </label>
              </div>
            )}
          </div>
          )}

          <button
            type="submit"
            disabled={loading || (password.length > 0 && !passwordAnalysis.isValid)}
            className={styles.buttonPrimary}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className={styles.divider}>Or</div>

        <button
          type="button"
          onClick={handleGoogleSignup}
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
          Continue with Google as {role === 'seller' ? 'Seller' : 'Customer'}
        </button>

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
