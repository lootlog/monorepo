import { PUBLIC_SITE_ORIGINS } from "@lootlog/domain/public-sites";
import { PUBLIC_API_SERVICES } from "@lootlog/schema/api-services";
import { createDocsSite } from "@lootlog/ui/lib/docs-markdown";
import { source } from "~/lib/source";
import { portalText } from "~/lib/translations";

export const portalSite = createDocsSite({
  source,
  origin: PUBLIC_SITE_ORIGINS.developer,
  llms: {
    title: "Lootlog Developers",
    summary:
      "Build on Lootlog, an open-source Margonem companion: read timers, loot, kills and battles of the Organizations an API key may access over HTTP, subscribe to their events over WebSocket, or read the Lootlog game client from a Margonem userscript.",
    notes: `
Every guide has a Markdown version at the same URL with a \`.md\` suffix, and ${PUBLIC_SITE_ORIGINS.developer}/llms-full.txt holds all guides in one file. The OpenAPI documents below are the source of truth for endpoints and schemas; the typed TypeScript client is the \`@lootlog/sdk\` npm package.

Terms: an Organization is the top-level Lootlog group, anchored to exactly one Discord server (\`guild\` and \`guildId\` in API paths and fields). A Margonem clan is an in-game clan; one Organization can include several clans and players without a clan. A User is a person with a Lootlog account, a Member is a User in an Organization, and a Player is a Margonem character. An integration sees only what its key's owner can see in Lootlog.

The player guide (Polish) is at ${PUBLIC_SITE_ORIGINS.docs}/llms.txt.
`,
    firstSection: "Getting started",
    otherPagesSection: "Other pages",
    extraSections: [
      {
        title: "OpenAPI documents",
        links: PUBLIC_API_SERVICES.map((service) => ({
          title: `${service} service`,
          url: `${PUBLIC_SITE_ORIGINS.developer}/openapi/${service}.json`,
          description: portalText[`${service}Description`],
        })),
      },
    ],
  },
});
