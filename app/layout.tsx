import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FunePlan - Funeral Life Plan System',
  description: 'Funeral Life Plan Payment and Service Monitoring System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
