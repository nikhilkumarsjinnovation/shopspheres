import type { Metadata } from 'next';
import { Outfit, Source_Sans_3 } from 'next/font/google';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import './accessibility.css';
import '@/styles/tokens.css';

const display = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
});

const body = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ShopSphere',
  description: 'ShopSphere marketplace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className={body.className}>
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
