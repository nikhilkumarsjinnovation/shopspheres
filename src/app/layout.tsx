import type { Metadata } from 'next';
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
