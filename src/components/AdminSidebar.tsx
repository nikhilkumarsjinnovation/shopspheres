'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';

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
    <aside>
      <div>
        <div>
          <Link href="/admin/dashboard">
            ShopSphere
          </Link>
          <span>Ops</span>
        </div>
        <p>Monochrome control</p>
      </div>

      <div />

      <nav aria-label="Admin">
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

      <div />

      <div>
        <div>
          <div>{avatarInitial}</div>
          <div>
            <span title={email}>
              {email || 'admin'}
            </span>
            <span>{role}</span>
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
