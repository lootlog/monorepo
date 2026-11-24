import { createFileRoute } from "@tanstack/react-router";
import { HomeContent } from "@/components/landing/home-content";
import { landingPageHead } from "@/config/page-head";
import landingTranslations from "@/i18n/translations/landing.json";

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
  head: () =>
    landingPageHead({
      path: "/",
      title: seo.title,
      description: seo.description,
    }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <HomeContent />
    </>
  );
}
