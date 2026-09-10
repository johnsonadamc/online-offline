import type { Metadata } from "next";
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import "./globals.css";
import RegistrationMarks from '@/components/layout/RegistrationMarks';

// Design System v2 fonts (Phase 13 retired Instrument Sans + Courier Prime; the
// magazine templates load their own fonts in the generated HTML).
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "online//offline",
  description: "slowcial media, deliberate by design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <div className="grain" aria-hidden="true" />
        <RegistrationMarks />
        {children}
      </body>
    </html>
  );
}
