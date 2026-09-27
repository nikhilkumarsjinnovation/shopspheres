import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AccessibilityProvider } from '@/context/AccessibilityContext';

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
    <html lang="en">
      <body>
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
