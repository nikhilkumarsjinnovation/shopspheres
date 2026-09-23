import type { Metadata } from 'next';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import './accessibility.css';

export const metadata: Metadata = {
  title: 'ShopSphere | Amazon-Scale Marketplace & Personal AI',
  description: 'ShopSphere E-Commerce Platform - Hyperlocal Marketplace with Real-Time Personal AI and Saksham Inclusive Accessibility',
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
