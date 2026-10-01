import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import '@/styles/globals.css';
import '@/styles/store-chrome.css';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import StoreChrome from '@/components/StoreChrome';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
  display: 'swap',
});

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
    <html lang="en" data-chrome={storeChrome ? 'store' : undefined} className={`${plusJakartaSans.variable} ${dmSans.variable}`}>
      <body>
        <StoreChrome />
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
