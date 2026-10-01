'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import SignOutButton from '@/components/SignOutButton';

interface CustomerNavbarProps {
  email?: string;
}

const navLinks = [
  { label: 'All products', href: '/explore' },
  { label: 'Shops', href: '/shops' },
  { label: 'Orders', href: '/orders' },
  { label: 'Gifts', href: '/gifts' },
  { label: 'Assistant', href: '/agent' },
];

export default function CustomerNavbar({ email }: CustomerNavbarProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const [openMenu, setOpenMenu] = useState<'account' | null>(null);

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/explore" className="brand-logo" aria-label="ShopSphere home">
          <span className="brand-mark">S</span>
          <span>ShopSphere</span>
        </Link>

        {/* Primary Navigation Links in Navbar (Search bar moved below navbar) */}
        <nav className="nav-links" aria-label="Main Navigation">
          {navLinks.map((item) => {
            const isActive =
              item.href === '/explore'
                ? pathname === '/explore' || pathname === '/'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link-item ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          <Link href="/wishlist" className="icon-btn" aria-label="Wishlist">
            <Heart size={16} />
            <span className="user-email-chip" style={{ display: 'inline', maxWidth: 'none' }}>Wishlist</span>
          </Link>

          <div className="header-menu">
            <button
              type="button"
              className="header-menu-btn"
              aria-expanded={openMenu === 'account'}
              aria-haspopup="menu"
              onClick={() => setOpenMenu((current) => (current === 'account' ? null : 'account'))}
            >
              <User size={16} />
              Account
            </button>
            {openMenu === 'account' && (
              <div className="header-menu-panel align-end" role="menu">
                {email && <p style={{ padding: '8px 10px', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{email}</p>}
                <Link href="/profile" role="menuitem">Profile</Link>
                <Link href="/orders" role="menuitem">Orders</Link>
                <Link href="/gifts" role="menuitem">Gifts</Link>
                <div style={{ padding: '6px 4px' }}>
                  <SignOutButton />
                </div>
              </div>
            )}
          </div>

          <Link
            href="/checkout"
            className="bag-btn"
            aria-label={totalItems > 0 ? `Cart with ${totalItems} items` : 'Cart, empty'}
          >
            <ShoppingBag size={16} />
            <span>Cart</span>
            {totalItems > 0 && <span className="bag-badge">{totalItems}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
