import { createFileRoute } from "@tanstack/react-router";
import { SiteNotFound } from "@/components/site-not-found";
import landingTranslations from "@/i18n/translations/landing.json";

const { notFound } = landingTranslations;

export const Route = createFileRoute("/404")({
  head: () => ({
    meta: [
      { title: `${notFound.title} | Lootlog` },
      { name: "description", content: notFound.description },
      { name: "robots", content: "noindex" },
      { name: "googlebot", content: "noindex" },
    ],
  }),
  component: SiteNotFound,
});
