import { Toaster } from '@/components/ui/sonner';

import type { Metadata } from 'next';
import './globals.css';

// CI環境では Google Fonts を無効化し、システムフォントを使用
const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

let geistSans: { variable: string; className?: string };
let geistMono: { variable: string; className?: string };

if (!isCI) {
  // 本番・開発環境では Google Fonts を使用
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Geist, Geist_Mono } = require('next/font/google');

  geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
    fallback: [
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'arial',
      'sans-serif',
    ],
    display: 'swap',
    preload: true,
  });

  geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
    fallback: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'monospace'],
    display: 'swap',
    preload: true,
  });
} else {
  // CI環境ではシステムフォントのみ使用
  geistSans = {
    variable: '--font-geist-sans',
    className: '',
  };
  geistMono = {
    variable: '--font-geist-mono',
    className: '',
  };
}

/**
 * Metadata configuration for the application
 *
 * @public
 */
export const metadata: Metadata = {
  title: 'Next.js Boilerplate',
  description: 'Production-ready Next.js boilerplate for enterprise applications',
};

/**
 * Root layout component for the application
 *
 * @public
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CI環境ではフォント変数を手動で設定
  const fontClasses = isCI
    ? 'font-sans' // システムフォントを使用
    : `${geistSans.variable} ${geistMono.variable} antialiased`;

  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={fontClasses}>
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
