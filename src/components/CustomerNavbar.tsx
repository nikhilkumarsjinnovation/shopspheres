'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import SignOutButton from '@/components/SignOutButton';
import * as styles from '@/app/(customer)/customer.css';

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
    <header className={styles.navbar}>
      <div className={styles.navLeft}>
        <Link href="/explore" className={styles.brandTitle}>
          ShopSphere
        </Link>
      </div>

      <nav className={styles.navLinks} aria-label="Customer">
        <Link href="/explore" className={`${styles.navLink} ${isExploreActive ? styles.navLinkActive : ''}`}>
          Index
        </Link>
        <Link href="/shops" className={`${styles.navLink} ${pathname.startsWith('/shops') ? styles.navLinkActive : ''}`}>
          Rooms
        </Link>
        <Link href="/orders" className={`${styles.navLink} ${pathname === '/orders' ? styles.navLinkActive : ''}`}>
          Ledger
        </Link>
        <Link href="/gifts" className={`${styles.navLink} ${pathname.startsWith('/gifts') ? styles.navLinkActive : ''}`}>
          Gifts
        </Link>
        <Link href="/friends" className={`${styles.navLink} ${pathname.startsWith('/friends') ? styles.navLinkActive : ''}`}>
          Circle
        </Link>
      </nav>

      <div className={styles.navRight}>
        <button
          type="button"
          onClick={handleOpenAI}
          title="Ask AI"
          style={{
            height: 34,
            padding: '0 12px',
            border: '1px solid #111111',
            background: '#ffffff',
            color: '#111111',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Guide
        </button>
        <Link
          href="/checkout"
          className={`${styles.cartLink} ${isCheckoutActive ? styles.navLinkActive : ''}`}
          aria-label={totalItems > 0 ? `Cart, ${totalItems} items` : 'Cart'}
        >
          Bag
          {totalItems > 0 ? <span className={styles.cartBadge}>{totalItems}</span> : null}
        </Link>
        {email ? (
          <span
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#737373',
              maxWidth: 110,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
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
