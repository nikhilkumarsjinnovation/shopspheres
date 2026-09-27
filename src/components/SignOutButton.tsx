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
    >
      Exit
    </button>
  );
}
