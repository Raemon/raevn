import type { ReactNode } from 'react';
import './globals.css';
const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
};
export default RootLayout;
export const metadata = { title: 'RAEVN Ten Years and Ten Days', description: 'Catalog of charts and numbers from ai-2027.com' };
