import { createFileRoute } from "@tanstack/react-router";
import {
  catalogControllerGetEvents,
  catalogControllerGetIndex,
} from "@lootlog/client/catalog";
import { escape } from "es-toolkit";
import {
  WIKI_GAME_VERSION,
  itemPageParams,
  npcPageParams,
} from "@/lib/catalog-links";
import { configureWikiServerApiClients } from "@/lib/configure-api-clients";
import { WIKI_ORIGIN } from "@/lib/link-preview";

// The whole catalog arrives in one response; it may take longer than a page.
const CATALOG_TIMEOUT_MS = 10_000;

// Search engines read the sitemap a few times a day; the catalog changes
// with game updates.
const CACHE_CONTROL = "public, max-age=3600";

const PAGES = ["/", "/items", "/npcs", "/events", "/calculators"];

/**
 * Every catalog page under its canonical address, so search engines find
 * the items and monsters no other page links to.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        configureWikiServerApiClients();

        const options = { apiClient: { timeoutMs: CATALOG_TIMEOUT_MS } };

        const catalog = await Promise.all([
          catalogControllerGetIndex(
            { gameVersion: WIKI_GAME_VERSION },
            options,
          ),
          catalogControllerGetEvents(
            { gameVersion: WIKI_GAME_VERSION },
            options,
          ),
        ]).catch(() => undefined);

        // A partial sitemap would tell search engines the pages left out
        // are gone.
        if (!catalog) {
          return new Response(null, {
            status: 503,
            headers: { "Retry-After": "300" },
          });
        }

        const [{ items, npcs }, { events }] = catalog;

        const paths = [
          ...PAGES,
          ...events.map(({ slug }) => `/events/${slug}`),
          ...items.map((item) => `/items/${itemPageParams(item).itemSlug}`),
          ...npcs.map((npc) => `/npcs/${npcPageParams(npc).npcSlug}`),
        ];

        const urls = paths
          .map(
            (path) =>
              `<url><loc>${escape(`${WIKI_ORIGIN}${path}`)}</loc></url>`,
          )
          .join("");

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
          {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": CACHE_CONTROL,
            },
          },
        );
      },
    },
  },
});
