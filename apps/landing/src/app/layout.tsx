import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@lootlog/ui/globals.css";
import type { JSX, ReactNode } from "react";

import { CookieConsent } from "@/src/components/cookie-consent";
import { I18nProvider } from "@/src/components/i18n-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lootlog.pl"),
  title: {
    default: "Lootlog.pl - Dodatek do gry Margonem",
    template: "%s | Lootlog.pl",
  },
  description:
    "Zaawansowany dodatek do gry Margonem, który automatycznie śledzi łupy i timery respawnu potworów. Synchronizowane timery, analiza walk i historia łupów. Darmowy i Open Source.",
  keywords: [
    "margonem",
    "dodatek",
    "lootlog",
    "timery",
    "łupy",
    "mmorpg",
    "gra",
    "discord",
    "addon",
    "margonem dodatek",
    "loot tracker",
    "timer synchronizacja",
    "analiza walk",
  ],
  authors: [{ name: "Lootlog.pl Team" }],
  creator: "Lootlog.pl Team",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Lootlog.pl - Dodatek do gry Margonem",
    description:
      "Synchronizowane timery, historia łupów i analiza walk. Darmowy dodatek Open Source dla graczy Margonem.",
    type: "website",
    locale: "pl_PL",
    siteName: "Lootlog.pl",
    url: "https://lootlog.pl",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lootlog.pl - Dodatek do gry Margonem",
    description:
      "Synchronizowane timery, historia łupów i analiza walk. Darmowy dodatek Open Source dla graczy Margonem.",
  },
  alternates: {
    canonical: "https://lootlog.pl",
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
        <I18nProvider>
          {children}
          <CookieConsent />
        </I18nProvider>
      </body>
    </html>
  );
}
