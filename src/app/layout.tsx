import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Rally — Spontaneous Activity Finder',
  description:
    'Find nearby people who want to do the same activity right now. Create events, discover on a map, and rally your people.',
  icons: {
    icon: '/favicon.svg',
  },
  other: {
    'theme-color': '#6366F1',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
