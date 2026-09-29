'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Sparkles, Compass, Store, ReceiptText, Gift, Bot, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAgentBackground } from '@/context/AgentBackgroundContext';
import SignOutButton from '@/components/SignOutButton';

interface CustomerNavbarProps {
  email?: string;
}

export default function CustomerNavbar({ email }: CustomerNavbarProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { isWorking, lastCompletedTask } = useAgentBackground();

  const navItems = [
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Agent Tasks', href: '/agent', icon: Bot, isAgent: true },
    { label: 'Shops', href: '/shops', icon: Store },
    { label: 'Orders', href: '/orders', icon: ReceiptText },
    { label: 'Gifts', href: '/gifts', icon: Gift },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  const handleOpenAI = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shopsphere:open-ai'));
    }
  };

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        {/* Brand Logo */}
        <Link href="/explore" className="brand-logo" aria-label="ShopSphere Home">
          <span className="brand-mark">S</span>
          <span>ShopSphere</span>
        </Link>

        {/* Center Primary Nav */}
        <nav className="nav-links" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/explore' && pathname === '/') ||
              (item.href !== '/explore' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link-item ${item.isAgent ? 'agent-nav-link' : ''} ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.isAgent && <Bot size={15} style={{ marginRight: '0.35rem', verticalAlign: 'middle', color: 'var(--accent-electric)' }} />}
                <span>{item.label}</span>
                {item.isAgent && (
                  isWorking ? (
                    <span
                      style={{
                        marginLeft: '0.4rem',
                        padding: '0.12rem 0.5rem',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        borderRadius: 'var(--radius-full)',
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                      Working
                    </span>
                  ) : (
                    <span
                      style={{
                        marginLeft: '0.4rem',
                        padding: '0.1rem 0.4rem',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--accent-electric)',
                        color: '#ffffff',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      AI
                    </span>
                  )
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="header-actions">
          {/* Ask AI Trigger */}
          <button
            type="button"
            className="btn-ai-guide"
            onClick={handleOpenAI}
            title="Personal AI Shopping Assistant"
            aria-label="Open AI Shopping Assistant"
          >
            <Sparkles size={14} />
            <span>Ask AI</span>
          </button>

          {/* Shopping Bag Button */}
          <Link
            href="/checkout"
            className="bag-btn"
            aria-label={totalItems > 0 ? `Shopping Bag with ${totalItems} items` : 'Shopping Bag, empty'}
          >
            <ShoppingBag size={16} />
            <span>Bag</span>
            {totalItems > 0 && <span className="bag-badge">{totalItems}</span>}
          </Link>

          {/* User Account / Email */}
          {email && (
            <Link
              href="/profile"
              className="user-email-chip"
              title={`Logged in as ${email} — View Profile`}
              aria-label="User Profile"
              style={{ textDecoration: 'none', cursor: 'pointer', transition: 'color 0.15s ease' }}
            >
              {email}
            </Link>
          )}

          {/* Sign Out */}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
