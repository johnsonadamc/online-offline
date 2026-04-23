import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, Courier_Prime } from 'next/font/google';
import "./globals.css";
import RegistrationMarks from '@/components/layout/RegistrationMarks';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
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
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="grain" aria-hidden="true" />
        <RegistrationMarks />
        {children}
      </body>
    </html>
  );
}
