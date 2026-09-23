'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import * as styles from '@/app/(admin)/admin.css';

interface AdminSidebarProps {
  email?: string;
  role?: string;
}

const links = [
  { href: '/admin/dashboard', label: 'Pulse', index: '01', match: (p: string) => p === '/admin/dashboard' || p === '/dashboard' || p === '/admin' },
  { href: '/admin/users', label: 'Directory', index: '02', match: (p: string) => p === '/admin/users' },
  { href: '/admin/catalog', label: 'Archive', index: '03', match: (p: string) => p.startsWith('/admin/catalog') },
  { href: '/admin/orders', label: 'Ledger', index: '04', match: (p: string) => p.startsWith('/admin/orders') },
  { href: '/admin/shops', label: 'Tenants', index: '05', match: (p: string) => p.startsWith('/admin/shops') },
  { href: '/admin/logs', label: 'Trace', index: '06', match: (p: string) => p === '/admin/logs' },
];

export default function AdminSidebar({ email, role = 'admin' }: AdminSidebarProps) {
  const pathname = usePathname();
  const avatarInitial = email ? email.charAt(0).toUpperCase() : 'A';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandSection}>
        <div className={styles.brandRow}>
          <Link href="/admin/dashboard" className={styles.brandTitle}>
            ShopSphere
          </Link>
          <span className={styles.adminBadge}>Ops</span>
        </div>
        <p className={styles.brandSubtitle}>Monochrome control</p>
      </div>

      <div className={styles.separator} />

      <nav className={styles.navSection} aria-label="Admin">
        {links.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
            >
              <span style={{ fontSize: '0.58rem', letterSpacing: '0.1em', opacity: 0.5, minWidth: 18 }}>
                {link.index}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.separator} />

      <div className={styles.sidebarFooter}>
        <div className={styles.adminProfileCard}>
          <div className={styles.adminAvatar}>{avatarInitial}</div>
          <div className={styles.adminDetails}>
            <span className={styles.adminEmail} title={email}>
              {email || 'admin'}
            </span>
            <span className={styles.adminRole}>{role}</span>
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
