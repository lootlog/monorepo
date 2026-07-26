import { RootProvider } from "fumadocs-ui/provider/next";
import type { Translations } from "fumadocs-ui/i18n";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { DocsSearchDialog } from "@/components/docs-search-dialog";
import "./global.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
});

const polishTranslations = {
  "Close Search(search dialog)(aria-label)": "Zamknij wyszukiwanie",
  "Close Sidebar(aria-label)": "Zamknij nawigację",
  "Close Sidebar(sidebar)(aria-label)": "Zamknij nawigację",
  "Collapse Sidebar(sidebar)(aria-label)": "Zwiń nawigację",
  "Copied Text(code block)(aria-label)": "Skopiowano kod",
  "Copy Anchor Link(heading anchor)(aria-label)": "Skopiuj link do nagłówka",
  "Copy Text(code block)(aria-label)": "Skopiuj kod",
  "Next Page(pagination)": "Następna strona",
  "No Headings(table of contents)": "Brak nagłówków",
  "No results found(search dialog)": "Brak wyników",
  "On this page(table of contents)": "Na tej stronie",
  "Open Search(search trigger)(aria-label)": "Otwórz wyszukiwanie",
  "Open Sidebar(sidebar)(aria-label)": "Otwórz nawigację",
  "Previous Page(pagination)": "Poprzednia strona",
  "Search(search dialog)": "Szukaj w dokumentacji",
  "Search(search trigger)": "Szukaj",
  "Show Sidebar(sidebar)": "Pokaż nawigację",
  "Table of Contents(inline table of contents)": "Spis treści",
  "Toggle Menu(mobile menu)(aria-label)": "Przełącz menu",
  displayName: "Polski",
} satisfies Partial<Translations>;

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.lootlog.pl"),
  title: {
    default: "Dokumentacja Lootlog",
    template: "%s | Dokumentacja Lootlog",
  },
  description:
    "Instrukcje instalacji, obsługi dodatku i panelu webowego Lootlog dla graczy Margonem.",
  icons: {
    icon: "/brand/favicon.svg",
    apple: "/brand/lootlog-apple-touch.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pl"
      className={`${geist.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body>
        <RootProvider
          theme={{ enabled: false }}
          i18n={{ locale: "pl", translations: polishTranslations }}
          search={{ SearchDialog: DocsSearchDialog }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
