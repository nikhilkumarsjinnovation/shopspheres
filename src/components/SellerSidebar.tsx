'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import styles from '@/app/seller/seller.module.css';

interface SellerSidebarProps {
  email?: string;
}

const links = [
  { href: '/seller/dashboard', label: 'Overview', index: '01', match: (p: string) => p === '/seller/dashboard' },
  { href: '/seller/branding', label: 'Identity', index: '02', match: (p: string) => p === '/seller/branding' },
  { href: '/seller/shop', label: 'Storefront', index: '03', match: (p: string) => p === '/seller/shop' },
  { href: '/seller/orders', label: 'Fulfillment', index: '04', match: (p: string) => p.startsWith('/seller/orders') },
  { href: '/seller/add-product', label: 'New listing', index: '05', match: (p: string) => p === '/seller/add-product' },
];

export default function SellerSidebar({ email }: SellerSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <h2 className={styles.brandTitle}>ShopSphere</h2>
        <span className={styles.brandBadge}>Atelier</span>
      </div>

      <nav className={styles.nav} aria-label="Seller">
        {links.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
            >
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.08em', opacity: 0.55, minWidth: 18 }}>
                {link.index}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        {email ? (
          <div className={styles.userEmail} title={email}>
            {email}
          </div>
        ) : null}
        <SignOutButton />
      </div>
    </aside>
  );
}
