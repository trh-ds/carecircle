import type { ReactNode } from 'react';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <title>CareCircle — API Test Dashboard</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
