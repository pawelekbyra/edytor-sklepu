import type { ReactNode } from 'react';

export const metadata = {
  title: 'Storefront demo — własne repo',
  description: 'Renderuje dokument strony z własnego repo przez @pawelekbyra/renderer',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
