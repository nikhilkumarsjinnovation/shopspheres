'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import styles from '@/app/seller/seller.module.css';

interface SellerSidebarProps {
  email?: string;
}

export default function SellerSidebar({ email }: SellerSidebarProps) {
  const pathname = usePathname();

  const isDashboardActive = pathname === '/seller/dashboard';
  const isAddProductActive = pathname === '/seller/add-product';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <h2 className={styles.brandTitle}>ShopSphere</h2>
        <span className={styles.brandBadge}>Seller</span>
      </div>

      <nav className={styles.nav}>
        <Link
          href="/seller/dashboard"
          className={`${styles.navItem} ${isDashboardActive ? styles.navItemActive : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </Link>

        <Link
          href="/seller/add-product"
          className={`${styles.navItem} ${isAddProductActive ? styles.navItemActive : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Add Product
        </Link>
      </nav>

      <div className={styles.sidebarFooter}>
        {email && (
          <div className={styles.userEmail} title={email}>
            {email}
          </div>
        )}
        <SignOutButton />
      </div>
    </aside>
  );
}
