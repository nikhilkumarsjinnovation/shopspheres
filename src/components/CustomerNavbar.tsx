'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import SignOutButton from '@/components/SignOutButton';
import * as styles from '@/app/(customer)/customer.css';

interface CustomerNavbarProps {
  email?: string;
}

export default function CustomerNavbar({ email }: CustomerNavbarProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { setIsOpenModal, hasDisability } = useAccessibility();

  const isExploreActive = pathname === '/explore' || pathname === '/';
  const isOrdersActive = pathname === '/orders';
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
          <span>ShopSphere</span>
          <span className={styles.brandBadge}>India</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569', cursor: 'pointer' }} title="Deliver to Indian Address">
          <span>📍</span>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1 }}>Deliver to</div>
            <strong style={{ color: '#0f172a' }}>India (All PINs)</strong>
          </div>
        </div>

        <nav className={styles.navLinks}>
          <Link
            href="/explore"
            className={`${styles.navLink} ${isExploreActive ? styles.navLinkActive : ''}`}
          >
            Explore
          </Link>
          <Link
            href="/shops"
            className={`${styles.navLink} ${pathname.startsWith('/shops') ? styles.navLinkActive : ''}`}
          >
            Shops
          </Link>

          <Link
            href="/orders"
            className={`${styles.navLink} ${isOrdersActive ? styles.navLinkActive : ''}`}
          >
            My Orders
          </Link>
          <Link
            href="/gifts"
            className={`${styles.navLink} ${pathname.startsWith('/gifts') ? styles.navLinkActive : ''}`}
          >
            Gifts
          </Link>
          <Link
            href="/friends"
            className={`${styles.navLink} ${pathname.startsWith('/friends') ? styles.navLinkActive : ''}`}
          >
            Friends
          </Link>
        </nav>
      </div>

      <div className={styles.navRight} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Ask Personal AI button */}
        <button
          type="button"
          onClick={handleOpenAI}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontSize: '12px',
            fontWeight: 700,
            border: '1px solid #334155',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#38bdf8' }}>✨</span>
          <span>Ask Personal AI</span>
        </button>

        {/* Saksham Accessibility Quick Access — hidden until the feature is ready */}
        {false && (
        <button
          type="button"
          onClick={() => setIsOpenModal(true)}
          title="Saksham Inclusive Accessibility Controls (WCAG 2.2 AAA)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            borderRadius: '8px',
            backgroundColor: hasDisability ? '#e0f2fe' : '#f8fafc',
            color: hasDisability ? '#0369a1' : '#475569',
            fontSize: '12px',
            fontWeight: 600,
            border: hasDisability ? '1px solid #38bdf8' : '1px solid #cbd5e1',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span>♿</span>
          <span>Saksham</span>
          {hasDisability && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#0284c7',
              }}
            />
          )}
        </button>
        )}

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
