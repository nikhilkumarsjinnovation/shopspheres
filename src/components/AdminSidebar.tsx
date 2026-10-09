'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Users, Archive, FileText, Store, ShieldCheck, Brain, Megaphone } from 'lucide-react';
import SignOutButton from '@/components/SignOutButton';

interface AdminSidebarProps {
  email?: string;
  role?: string;
}

const links = [
  { href: '/admin/dashboard', label: 'Pulse / Overview', icon: Activity, match: (p: string) => p === '/admin/dashboard' || p === '/dashboard' || p === '/admin' },
  { href: '/admin/assistant', label: 'Platform RAG & AI', icon: Brain, match: (p: string) => p.startsWith('/admin/assistant') },
  { href: '/admin/campaigns', label: 'Email Campaigns', icon: Megaphone, match: (p: string) => p.startsWith('/admin/campaigns') },
  { href: '/admin/users', label: 'User Directory', icon: Users, match: (p: string) => p === '/admin/users' },
  { href: '/admin/catalog', label: 'Catalog Approvals', icon: Archive, match: (p: string) => p.startsWith('/admin/catalog') },
  { href: '/admin/orders', label: 'Order Ledger', icon: FileText, match: (p: string) => p.startsWith('/admin/orders') },
  { href: '/admin/shops', label: 'Merchant Tenants', icon: Store, match: (p: string) => p.startsWith('/admin/shops') },
  { href: '/admin/logs', label: 'Audit Logs', icon: ShieldCheck, match: (p: string) => p === '/admin/logs' },
];

export default function AdminSidebar({ email, role = 'admin' }: AdminSidebarProps) {
  const pathname = usePathname();
  const avatarInitial = email ? email.charAt(0).toUpperCase() : 'A';

  return (
    <aside className="portal-sidebar">
      {/* Brand Header */}
      <div className="portal-sidebar-brand" style={{ marginBottom: '2.5rem', flexShrink: 0 }}>
        <Link href="/admin/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="brand-mark" style={{ width: '28px', height: '28px', fontSize: '0.9rem' }}>A</div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'block' }}>ShopSphere</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>Admin Console</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav aria-label="Admin Portal Navigation" className="portal-sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {links.map((link) => {
          const active = link.match(pathname);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`portal-link${active ? ' is-active' : ''}`}
            >
              <Icon size={16} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Sign out */}
      <div className="portal-sidebar-footer" style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0, marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-full)', background: 'var(--fg-primary)', color: 'var(--fg-inverted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
            {avatarInitial}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={email}>
              {email || 'Administrator'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{role}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <Link href="/explore" className="portal-quiet" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Storefront
          </Link>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
