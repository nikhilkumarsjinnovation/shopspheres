'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Search, ShoppingBag, User, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import SignOutButton from '@/components/SignOutButton';

interface CustomerNavbarProps {
  email?: string;
}

const browseLinks = [
  { label: 'All products', href: '/explore' },
  { label: 'Shops', href: '/shops' },
  { label: 'Orders', href: '/orders' },
  { label: 'Gifts', href: '/gifts' },
  { label: 'Assistant', href: '/agent' },
];

export default function CustomerNavbar({ email }: CustomerNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems } = useCart();
  const [query, setQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<'categories' | 'account' | null>(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  const publishSearch = (value: string) => {
    if (pathname?.startsWith('/explore')) {
      window.dispatchEvent(new CustomEvent('shopsphere:header-search', { detail: { query: value } }));
    }
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
    publishSearch(value);
  };

  const onSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    if (pathname?.startsWith('/explore')) {
      publishSearch(next);
      return;
    }
    router.push(next ? `/explore?q=${encodeURIComponent(next)}` : '/explore');
  };

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/explore" className="brand-logo" aria-label="ShopSphere home">
          <span className="brand-mark">S</span>
          <span>ShopSphere</span>
        </Link>

        <div className="header-menu">
          <button
            type="button"
            className="header-menu-btn"
            aria-expanded={openMenu === 'categories'}
            aria-haspopup="menu"
            onClick={() => setOpenMenu((current) => (current === 'categories' ? null : 'categories'))}
          >
            Categories
          </button>
          {openMenu === 'categories' && (
            <div className="header-menu-panel" role="menu">
              {browseLinks.map((item) => (
                <Link key={item.href} href={item.href} role="menuitem">
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <form className="header-search" onSubmit={onSearchSubmit} role="search">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="search"
              className="search-input"
              value={query}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </form>

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
                {email && <p style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#71717a' }}>{email}</p>}
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
