import './globals.css';

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <title>My Website</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
