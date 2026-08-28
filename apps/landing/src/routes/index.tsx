import { createFileRoute } from "@tanstack/react-router";
import { HomeContent } from "@/src/components/landing/home-content";
import landingTranslations from "@/src/i18n/translations/landing.json";

const { seo } = landingTranslations;

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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: seo.title },
      { name: "description", content: seo.description },
      { name: "keywords", content: seo.keywords.join(", ") },
    ],
    links: [{ rel: "canonical", href: "https://lootlog.pl" }],
  }),
  component: HomePage,
});

function HomePage() {
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
