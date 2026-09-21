import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ShopSphere',
  description: 'ShopSphere E-Commerce Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
