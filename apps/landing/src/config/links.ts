import { blogPosts } from "./blog.ts";

export const landingDocumentPaths = [
  "/",
  "/privacy-policy",
  "/terms-of-service",
  "/blog",
  ...blogPosts.map((post) => post.path),
];

export const links = {
  developer: "https://developer.lootlog.pl",
  docs: "https://docs.lootlog.pl/docs",
  installationGuide: "https://docs.lootlog.pl/docs/installation",
  battleGuide: "https://docs.lootlog.pl/docs/battle-panel",
  organizationGuide: "https://docs.lootlog.pl/docs/clan-features",
  addonGuide: "https://docs.lootlog.pl/docs/features",
  github: "https://github.com/lootlog/monorepo",
  discord: "https://discord.gg/mPcczaeYMu",
  support: "https://buycoffee.to/lootlog",
  dashboard: "/signin",
} as const;
