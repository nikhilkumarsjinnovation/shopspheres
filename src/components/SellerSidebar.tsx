'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';

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
    <aside>
      <div>
        <h2>ShopSphere</h2>
        <span>Atelier</span>
      </div>

      <nav aria-label="Seller">
        {links.map((link) => {
          const active = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
            >
              <span>
                {link.index}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div>
        {email ? (
          <div title={email}>
            {email}
          </div>
        ) : null}
        <SignOutButton />
      </div>
    </aside>
  );
}
