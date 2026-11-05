import {
  formatLlmsIndex,
  formatPageMarkdown,
  getMarkdownPath,
  groupPageUrls,
} from "@lootlog/ui/lib/docs-markdown";
import { PORTAL_ORIGIN } from "~/lib/seo";
import { source } from "~/lib/source";
import { portalText } from "~/lib/translations";

type PortalPage = ReturnType<typeof source.getPages>[number];

const services = [
  ["main", portalText.mainDescription],
  ["activity", portalText.activityDescription],
  ["battlelog", portalText.battlelogDescription],
  ["search", portalText.searchDescription],
] as const;

export function getPageMarkdownPath(page: PortalPage) {
  return getMarkdownPath(page.url, page.slugs);
}

export async function renderPageMarkdown(page: PortalPage) {
  return formatPageMarkdown({
    title: page.data.title,
    description: page.data.description,
    url: `${PORTAL_ORIGIN}${page.url}`,
    content: await page.data.getText("processed"),
  });
}

/** Guide pages in sidebar order. */
function getPages() {
  const pagesByUrl = new Map(source.getPages().map((page) => [page.url, page]));

  return groupPageUrls(source.getPageTree().children, "Getting started").map(
    (section) => ({
      title: section.title,
      pages: section.urls.flatMap((url) => pagesByUrl.get(url) ?? []),
    }),
  );
}

export function renderLlmsIndex() {
  return formatLlmsIndex({
    title: "Lootlog Developers",
    summary:
      "Build on Lootlog, an open-source Margonem companion: read timers, loot, kills and battles of the Organizations an API key may access over HTTP, subscribe to their events over WebSocket, or read the Lootlog game client from a Margonem userscript.",
    notes: `
Every guide has a Markdown version at the same URL with a \`.md\` suffix, and ${PORTAL_ORIGIN}/llms-full.txt holds all guides in one file. The OpenAPI documents below are the source of truth for endpoints and schemas; the typed TypeScript client is the \`@lootlog/sdk\` npm package.

Terms: an Organization is the top-level Lootlog group, anchored to exactly one Discord server (\`guild\` and \`guildId\` in API paths and fields). A Margonem clan is an in-game clan; one Organization can include several clans and players without a clan. A User is a person with a Lootlog account, a Member is a User in an Organization, and a Player is a Margonem character. An integration sees only what its key's owner can see in Lootlog.

The player guide (Polish) is at https://docs.lootlog.pl/llms.txt.
`,
    sections: [
      ...getPages().map((section) => ({
        title: section.title,
        links: section.pages.map((page) => ({
          title: page.data.title,
          url: `${PORTAL_ORIGIN}${getPageMarkdownPath(page)}`,
          description: page.data.description,
        })),
      })),
      {
        title: "OpenAPI documents",
        links: services.map(([service, description]) => ({
          title: `${service} service`,
          url: `${PORTAL_ORIGIN}/openapi/${service}.json`,
          description,
        })),
      },
    ],
  });
}

export async function renderLlmsFull() {
  const pages = getPages().flatMap((section) => section.pages);
  const rendered = await Promise.all(pages.map(renderPageMarkdown));

  return rendered.join("\n---\n\n");
}
