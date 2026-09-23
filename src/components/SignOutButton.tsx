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
      onClick={handleSignOut}
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: '#ef4444',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 600,
        fontSize: '0.875rem',
        cursor: 'pointer',
      }}
    >
      Sign Out
    </button>
  );
}
