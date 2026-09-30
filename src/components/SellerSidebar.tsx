'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Palette, PackageCheck, PlusCircle, Brain } from 'lucide-react';
import SignOutButton from '@/components/SignOutButton';

interface SellerSidebarProps {
  email?: string;
}

const links = [
  { href: '/seller/dashboard', label: 'Overview', icon: LayoutDashboard, match: (p: string) => p === '/seller/dashboard' },
  { href: '/seller/assistant', label: 'Store RAG & AI', icon: Brain, match: (p: string) => p.startsWith('/seller/assistant') },
  { href: '/seller/branding', label: 'Identity & Brand', icon: Palette, match: (p: string) => p === '/seller/branding' },
  { href: '/seller/shop', label: 'Storefront', icon: Store, match: (p: string) => p === '/seller/shop' },
  { href: '/seller/orders', label: 'Fulfillment & Orders', icon: PackageCheck, match: (p: string) => p.startsWith('/seller/orders') },
  { href: '/seller/add-product', label: 'New Listing', icon: PlusCircle, match: (p: string) => p === '/seller/add-product' },
];

export default function SellerSidebar({ email }: SellerSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="portal-sidebar">
      {/* Brand Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link href="/seller/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="brand-mark" style={{ width: '28px', height: '28px', fontSize: '0.9rem' }}>S</div>
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.03em', display: 'block' }}>ShopSphere</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-muted)' }}>Seller Atelier</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav aria-label="Seller Portal Navigation" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        {links.map((link) => {
          const active = link.match(pathname);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.95rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--fg-primary)' : 'var(--fg-secondary)',
                background: active ? 'var(--bg-canvas)' : 'transparent',
                boxShadow: active ? 'var(--shadow-xs)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={16} style={{ color: active ? 'var(--fg-primary)' : 'var(--fg-muted)' }} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Sign out */}
      <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {email && (
          <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={email}>
            {email}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/explore" style={{ fontSize: '0.8rem', color: 'var(--accent-electric)', fontWeight: 600 }}>
            Marketplace View
          </Link>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
