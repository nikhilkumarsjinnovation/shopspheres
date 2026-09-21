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
  const isOrdersActive = pathname === '/orders';
  const isCheckoutActive = pathname === '/checkout';

  return (
    <header className={styles.navbar}>
      <div className={styles.navLeft}>
        <Link href="/explore" className={styles.brandTitle}>
          <span>ShopSphere</span>
          <span className={styles.brandBadge}>Market</span>
        </Link>

        <nav className={styles.navLinks}>
          <Link
            href="/explore"
            className={`${styles.navLink} ${isExploreActive ? styles.navLinkActive : ''}`}
          >
            Explore
          </Link>

          <Link
            href="/orders"
            className={`${styles.navLink} ${isOrdersActive ? styles.navLinkActive : ''}`}
          >
            My Orders
          </Link>
        </nav>
      </div>

      <div className={styles.navRight}>
        <Link
          href="/checkout"
          className={`${styles.cartLink} ${isCheckoutActive ? styles.navLinkActive : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span>Cart</span>
          {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
        </Link>

        {email && (
          <span style={{ fontSize: '0.85rem', color: '#64748b' }} title={email}>
            {email}
          </span>
        )}

        <SignOutButton />
      </div>
    </header>
  );
}
