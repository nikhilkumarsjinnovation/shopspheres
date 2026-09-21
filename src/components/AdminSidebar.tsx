'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Separator from '@radix-ui/react-separator';
import SignOutButton from '@/components/SignOutButton';
import * as styles from '@/app/(admin)/admin.css';

interface AdminSidebarProps {
  email?: string;
  role?: string;
}

export default function AdminSidebar({ email, role = 'admin' }: AdminSidebarProps) {
  const pathname = usePathname();

  const isHealthActive = pathname === '/admin/dashboard' || pathname === '/dashboard' || pathname === '/admin';
  const isUsersActive = pathname === '/admin/users';
  const isLogsActive = pathname === '/admin/logs';

  const avatarInitial = email ? email.charAt(0).toUpperCase() : 'A';

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.brandSection}>
        <div className={styles.brandRow}>
          <Link href="/admin/dashboard" className={styles.brandTitle}>
            <span>ShopSphere</span>
          </Link>
          <span className={styles.adminBadge}>Admin</span>
        </div>
        <p className={styles.brandSubtitle}>Platform Governance & Ops</p>
      </div>

      {/* Radix UI Separator Primitive */}
      <Separator.Root className={styles.separator} orientation="horizontal" />

      {/* Navigation Links */}
      <nav className={styles.navSection}>
        <span className={styles.navSectionLabel}>Core Telemetry</span>

        <Link
          href="/admin/dashboard"
          className={`${styles.navItem} ${isHealthActive ? styles.navItemActive : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Platform Health
        </Link>

        <span className={styles.navSectionLabel} style={{ marginTop: '1rem' }}>
          Governance
        </span>

        <Link
          href="/admin/users"
          className={`${styles.navItem} ${isUsersActive ? styles.navItemActive : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Users Audit
        </Link>

        <Link
          href="/admin/logs"
          className={`${styles.navItem} ${isLogsActive ? styles.navItemActive : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          System Logs
        </Link>
      </nav>

      {/* Radix UI Separator Primitive */}
      <Separator.Root className={styles.separator} orientation="horizontal" />

      {/* Sidebar Footer with Admin Identity and Sign Out */}
      <div className={styles.sidebarFooter}>
        <div className={styles.adminProfileCard}>
          <div className={styles.adminAvatar}>{avatarInitial}</div>
          <div className={styles.adminDetails}>
            <span className={styles.adminEmail} title={email}>
              {email || 'admin@shopsphere.internal'}
            </span>
            <span className={styles.adminRole}>{role}</span>
          </div>
        </div>

        <SignOutButton />
      </div>
    </aside>
  );
}
