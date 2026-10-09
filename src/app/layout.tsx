import type { Metadata } from 'next';
import { headers } from 'next/headers';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
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
    <html lang="en" data-chrome={storeChrome ? 'store' : undefined} className="ss-root-fonts">
      <body>
        <StoreChrome />
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
