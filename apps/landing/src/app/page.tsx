import type { Metadata } from "next";
import type { JSX } from "react";
import { HomeContent } from "@/src/components/landing/home-content";

export const metadata: Metadata = {
  title: "Lootlog.pl - Dodatek do Margonem | Timery, Łupy, Analiza Walk",
  description:
    "Przejmij kontrolę nad Margonem. Lootlog to darmowy dodatek z synchronizowanymi timerami, historią łupów i analizą walk. Open Source, tworzony przez społeczność.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Lootlog",
  url: "https://lootlog.pl",
  description:
    "Darmowy dodatek do gry Margonem z synchronizowanymi timerami, historią łupów i analizą walk.",
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
