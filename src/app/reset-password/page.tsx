'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type PasswordStrength = 'Weak' | 'Normal' | 'Strong';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time password strength analysis
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (!passwordAnalysis.hasMinLength) {
      setErrorMessage('New password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (passwordAnalysis.strength === 'Weak') {
      setErrorMessage('Password is too weak. Please combine uppercase, lowercase, numbers, or symbols.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter both passwords.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      router.push('/login?reset=success');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred while resetting password.';
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
          <h1 className="auth-title">Set New Password</h1>
          <p className="auth-subtitle">Enter your secure new password below</p>
        </div>

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

        <form onSubmit={handleUpdatePassword}>
          <div className="auth-form-group">
            <label htmlFor="newPassword" className="auth-label">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              className="auth-input"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Real-time Password Strength Meter */}
            {passwordAnalysis.strength && (
              <div style={{ marginTop: '0.5rem' }}>
                <div className="password-meter-bar">
                  <div
                    className={`password-meter-fill ${
                      passwordAnalysis.strength === 'Weak'
                        ? 'weak'
                        : passwordAnalysis.strength === 'Normal'
                        ? 'normal'
                        : 'strong'
                    }`}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.35rem', color: 'var(--fg-muted)' }}>
                  <span>Strength:</span>
                  <span style={{ fontWeight: 700, color: passwordAnalysis.strength === 'Strong' ? 'var(--success)' : passwordAnalysis.strength === 'Normal' ? 'var(--warning)' : 'var(--danger)' }}>
                    {passwordAnalysis.strength}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="auth-form-group">
            <label htmlFor="confirmPassword" className="auth-label">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              className="auth-input"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary-auth"
            disabled={loading || !passwordAnalysis.isValid}
          >
            {loading ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem' }}>
          <Link href="/login" style={{ color: 'var(--fg-muted)', fontWeight: 500 }}>
            Cancel and return to login
          </Link>
        </p>
      </div>
    </div>
  );
}
