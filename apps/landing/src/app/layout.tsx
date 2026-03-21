import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@lootlog/ui/globals.css";
import type { JSX, ReactNode } from "react";

import { CookieConsent } from "@/src/components/cookie-consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lootlog.pl - Dodatek do gry Margonem",
  description:
    "Zaawansowany dodatek do gry Margonem, który automatycznie śledzi łupy i timery respawnu potworów. Bezpłatny projekt hobbystyczny dla społeczności graczy.",
  keywords: [
    "margonem",
    "dodatek",
    "lootlog",
    "timery",
    "łupy",
    "mmorpg",
    "gra",
    "discord",
  ],
  authors: [{ name: "Lootlog.pl Team" }],
  openGraph: {
    title: "Lootlog.pl - Dodatek do gry Margonem",
    description:
      "Zaawansowany dodatek do gry Margonem, który automatycznie śledzi łupy i timery respawnu potworów.",
    type: "website",
    locale: "pl_PL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-white`}
      >
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
