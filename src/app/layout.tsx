import type { Metadata } from 'next';
import { headers } from 'next/headers';
import '@/styles/globals.css';
import '@/styles/store-chrome.css';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import StoreChrome from '@/components/StoreChrome';

export const metadata: Metadata = {
  title: 'ShopSphere',
  description: 'ShopSphere marketplace',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = (await headers()).get('x-pathname') ?? '';
  const storeChrome = path !== '/' && path !== '';

  return (
    <html lang="en" data-chrome={storeChrome ? 'store' : undefined}>
      <body>
        <StoreChrome />
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
