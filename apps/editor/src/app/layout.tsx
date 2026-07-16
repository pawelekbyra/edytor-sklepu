import type { ReactNode } from 'react';

export const metadata = {
  title: 'Edytor Sklepu — demo',
  description: 'Etap 6: canvas + drag&drop',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
