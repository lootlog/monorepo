import type { Metadata } from "next";
import type { JSX } from "react";
import { HomeContent } from "@/src/components/landing/home-content";

export const metadata: Metadata = {
  title: "Lootlog – timery respów, łupy i analiza walk w Margonem",
  description:
    "Darmowy dodatek do Margonem dla graczy i klanów. Synchronizuj timery respów, zapisuj łupy, analizuj walki i sprawdzaj aktywność w jednym panelu.",
  keywords: [
    "Lootlog",
    "dodatek do Margonem",
    "klan Margonem",
    "timery respów",
    "historia łupów",
    "analiza walk",
  ],
  openGraph: {
    title: "Lootlog – timery respów, łupy i analiza walk w Margonem",
    description:
      "Darmowy dodatek do Margonem dla graczy i klanów. Synchronizuj timery respów, zapisuj łupy, analizuj walki i sprawdzaj aktywność w jednym panelu.",
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
    title: "Lootlog – timery respów, łupy i analiza walk w Margonem",
    description:
      "Darmowy dodatek do Margonem dla graczy i klanów. Synchronizuj timery respów, zapisuj łupy, analizuj walki i sprawdzaj aktywność w jednym panelu.",
    images: ["/brand/lootlog-social.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Lootlog",
  url: "https://lootlog.pl",
  description:
    "Darmowy dodatek do Margonem dla graczy i klanów. Synchronizuj timery respów, zapisuj łupy, analizuj walki i sprawdzaj aktywność w jednym panelu.",
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "PLN",
  },
  author: {
    "@type": "Organization",
    name: "Lootlog.pl Team",
  },
};

export default function Home(): JSX.Element {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeContent />
    </>
  );
}
