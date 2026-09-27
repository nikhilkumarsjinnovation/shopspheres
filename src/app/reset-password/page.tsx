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

  // Real-time password strength analysis matching Phase 1 security requirement
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
    <div>
      <div>
        <h1>Set New Password</h1>
        <p>Enter your secure new password below</p>

        {errorMessage && <div>{errorMessage}</div>}

        <form onSubmit={handleUpdatePassword}>
          <div>
            <label htmlFor="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Real-time Password Strength Meter */}
            {passwordAnalysis.strength && (
              <div>
                <div>
                  <span>Password Strength</span>
                  <span
                  >
                    {passwordAnalysis.strength}
                  </span>
                </div>

                <div>
                  <div
                  />
                </div>

                <div>
                  <div
                  >
                    <span>{passwordAnalysis.hasMinLength ? '✓' : '○'}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div
                  >
                    <span>{passwordAnalysis.strength !== 'Weak' ? '✓' : '○'}</span>
                    <span>Contains mix of uppercase, lowercase, numbers, or symbols</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !passwordAnalysis.isValid}
          >
            {loading ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>

        <p>
          <Link href="/login">
            Cancel and return to login
          </Link>
        </p>
      </div>
    </div>
  );
}
