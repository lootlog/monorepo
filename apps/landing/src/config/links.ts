import {
  COMMUNITY_LINKS,
  PUBLIC_SITE_ORIGINS,
  WEB_SIGN_IN_PATH,
  docsPageUrl,
} from "@lootlog/domain/public-sites";
import { blogPosts } from "./blog.ts";

export const landingDocumentPaths = [
  "/",
  "/privacy-policy",
  "/terms-of-service",
  "/blog",
  ...blogPosts.map((post) => post.path),
];

export const links = {
  wiki: PUBLIC_SITE_ORIGINS.wiki,
  developer: PUBLIC_SITE_ORIGINS.developer,
  docs: docsPageUrl("index"),
  installationGuide: docsPageUrl("installation"),
  battleGuide: docsPageUrl("battle-panel"),
  organizationGuide: docsPageUrl("clan-features"),
  addonGuide: docsPageUrl("features"),
  github: COMMUNITY_LINKS.github,
  discord: COMMUNITY_LINKS.discord,
  support: "https://buycoffee.to/lootlog",
  dashboard: WEB_SIGN_IN_PATH,
} as const;
