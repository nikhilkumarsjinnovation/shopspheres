'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('shopsphere_cart');
      localStorage.removeItem('shopsphere_cart_guest');
    } catch {
      // Ignore
    }
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      title="Sign out"
      aria-label="Sign out"
      style={{
        height: 34,
        padding: '0 12px',
        border: '1px solid currentColor',
        background: 'transparent',
        color: 'currentColor',
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        fontFamily: 'inherit',
        opacity: 0.9,
      }}
    >
      Exit
    </button>
  );
}
