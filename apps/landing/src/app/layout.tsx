import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@lootlog/ui/globals.css";
import { JSX } from "react";
import { LayoutProps } from "@/.next/types/app/page";
import { PageHeader } from "@/src/components/page-header";

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
}: Readonly<LayoutProps>): JSX.Element {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-[#101218] via-purple-900 to-[#101218] text-white`}
      >
        <PageHeader />
        {children}
        <footer className="py-8 px-4 bg-gradient-to-r from-[#101218] via-purple-900/20 to-[#101218]">
          <div className="max-w-6xl mx-auto text-center text-gray-400">
            <p>
              Grafiki wykorzystane na stronie są własnością Garmory sp. z o.o.
            </p>
            <p>
              &copy; {new Date().getFullYear()} Lootlog.pl - Dodatek do gry
              Margonem
            </p>
            <div className="mt-4 flex justify-center gap-6">
              <a
                href="https://discord.gg/mPcczaeYMu"
                className="hover:text-white transition-colors"
              >
                Discord
              </a>
              <a
                href="https://github.com/lootlog/monorepo"
                className="hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a
                href="/privacy-policy"
                className="hover:text-white transition-colors"
              >
                Polityka Prywatności
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-white transition-colors"
              >
                Regulamin
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
