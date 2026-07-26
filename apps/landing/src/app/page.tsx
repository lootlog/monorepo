import type { Metadata } from "next";
import type { JSX } from "react";
import { HomeContent } from "@/src/components/landing/home-content";
import landingTranslations from "@/src/i18n/translations/landing.json";

const { seo } = landingTranslations;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  keywords: seo.keywords,
  openGraph: {
    title: seo.title,
    description: seo.description,
    type: "website",
    locale: "pl_PL",
    siteName: "Lootlog.pl",
    url: "https://lootlog.pl",
    images: [
      {
        url: "/brand/lootlog-social.png",
        width: 1200,
        height: 630,
        alt: seo.socialImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: ["/brand/lootlog-social.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Lootlog",
  url: "https://lootlog.pl",
  description: seo.description,
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
