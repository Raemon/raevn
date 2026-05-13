import type { ReactNode } from 'react';
const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
};
export default RootLayout;
export const metadata = { title: 'grading-ai-2027', description: 'Catalog of charts and numbers from ai-2027.com' };
