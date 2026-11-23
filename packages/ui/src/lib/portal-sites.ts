import {
  COMMUNITY_LINKS,
  PUBLIC_SITE_ORIGINS,
  docsPageUrl,
} from "@lootlog/domain/public-sites";

export const PORTAL_SITES = [
  { id: "lootlog", href: PUBLIC_SITE_ORIGINS.web, thirdParty: false },
  { id: "docs", href: docsPageUrl("index"), thirdParty: false },
  { id: "wiki", href: PUBLIC_SITE_ORIGINS.wiki, thirdParty: false },
  { id: "developer", href: PUBLIC_SITE_ORIGINS.developer, thirdParty: false },
  { id: "github", href: COMMUNITY_LINKS.github, thirdParty: true },
  { id: "discord", href: COMMUNITY_LINKS.discord, thirdParty: true },
] as const;

export type PortalSiteId = (typeof PORTAL_SITES)[number]["id"];

export type PortalSiteLabels = Record<PortalSiteId, string>;

export const otherPortalSites = (current: PortalSiteId) =>
  PORTAL_SITES.filter((site) => site.id !== current);

export const PORTAL_LEGAL_PAGES = {
  privacy: `${PUBLIC_SITE_ORIGINS.web}/privacy-policy`,
  terms: `${PUBLIC_SITE_ORIGINS.web}/terms-of-service`,
} as const;
