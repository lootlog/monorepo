import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@lootlog/ui/globals.css";
import "./landing.css";
import type { JSX, ReactNode } from "react";

import { CookieConsent } from "@/src/components/cookie-consent";
import { I18nProvider } from "@/src/components/i18n-provider";
import { MotionProvider } from "@/src/components/motion-provider";

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
    default: "Lootlog – dodatek do Margonem dla graczy i klanów",
    template: "%s | Lootlog.pl",
  },
  description:
    "Darmowy dodatek do Margonem dla graczy i klanów. Timery respów, historia łupów i analiza walk w jednym panelu.",
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
    "klan Margonem",
    "timery respów",
    "historia łupów",
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
    title: "Lootlog – dodatek do Margonem dla graczy i klanów",
    description:
      "Darmowy dodatek do Margonem dla graczy i klanów. Timery respów, historia łupów i analiza walk w jednym panelu.",
    type: "website",
    locale: "pl_PL",
    siteName: "Lootlog.pl",
    url: "https://lootlog.pl",
    images: [
      {
        url: "/brand/lootlog-social.png",
        width: 1200,
        height: 630,
        alt: "Lootlog – timery respów, łupy i analiza walk w Margonem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lootlog – dodatek do Margonem dla graczy i klanów",
    description:
      "Darmowy dodatek do Margonem dla graczy i klanów. Timery respów, historia łupów i analiza walk w jednym panelu.",
    images: ["/brand/lootlog-social.png"],
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
        className={`${geistSans.variable} ${geistMono.variable} bg-[#070908] text-[#e9e7de] antialiased`}
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        <I18nProvider>
          <MotionProvider>
            {children}
            <CookieConsent />
          </MotionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
