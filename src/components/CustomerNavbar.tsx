'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import SignOutButton from '@/components/SignOutButton';

interface CustomerNavbarProps {
  email?: string;
}

export default function CustomerNavbar({ email }: CustomerNavbarProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();

  const isExploreActive = pathname === '/explore' || pathname === '/';
  const isCheckoutActive = pathname === '/checkout';

  const handleOpenAI = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shopsphere:open-ai'));
    }
  };

  return (
    <header>
      <div>
        <Link href="/explore">
          ShopSphere
        </Link>
      </div>

      <nav aria-label="Customer">
        <Link href="/explore">
          Index
        </Link>
        <Link href="/shops">
          Rooms
        </Link>
        <Link href="/orders">
          Ledger
        </Link>
        <Link href="/gifts">
          Gifts
        </Link>
        <Link href="/friends">
          Circle
        </Link>
      </nav>

      <div>
        <button
          type="button"
          onClick={handleOpenAI}
          title="Ask AI"
        >
          Guide
        </button>
        <Link
          href="/checkout"
          aria-label={totalItems > 0 ? `Cart, ${totalItems} items` : 'Cart'}
        >
          Bag
          {totalItems > 0 ? <span>{totalItems}</span> : null}
        </Link>
        {email ? (
          <span
            title={email}
          >
            {email}
          </span>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
