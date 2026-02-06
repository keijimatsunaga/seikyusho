import type { ReactNode } from 'react';

export const metadata = {
  title: 'Seikyusho MVP',
  description: 'Multi-tenant invoicing MVP'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '2rem' }}>{children}</body>
    </html>
  );
}
