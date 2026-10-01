'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Keeps the marketplace theme on client navigations. Homepage stays unset. */
export default function StoreChrome() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (pathname === '/') delete root.dataset.chrome;
    else root.dataset.chrome = 'store';
  }, [pathname]);

  return null;
}
