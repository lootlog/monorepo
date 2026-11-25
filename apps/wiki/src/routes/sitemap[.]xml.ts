import { createFileRoute } from "@tanstack/react-router";
import {
  catalogControllerGetEvents,
  catalogControllerGetIndex,
} from "@lootlog/client/catalog";
import {
  WIKI_GAME_VERSION,
  itemPageParams,
  npcPageParams,
} from "@/lib/catalog-links";
import { configureWikiServerApiClients } from "@/lib/configure-api-clients";
import { PUBLIC_SITE_ORIGINS, sitemapXml } from "@lootlog/domain/public-sites";

const CATALOG_TIMEOUT_MS = 10_000;

const CACHE_CONTROL = "public, max-age=3600";

const PAGES = ["/", "/items", "/npcs", "/events", "/calculators", "/sockets"];

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

        return new Response(
          sitemapXml(paths.map((path) => `${PUBLIC_SITE_ORIGINS.wiki}${path}`)),
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
