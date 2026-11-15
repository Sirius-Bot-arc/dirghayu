
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dirghayu | Care with Dignity',
  description: 'Elder-led healthcare and medication management.',
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
