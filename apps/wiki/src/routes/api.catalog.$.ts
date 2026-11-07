import { createFileRoute } from "@tanstack/react-router";
import {
  catalogUpstreamUrl,
  readCatalogUpstream,
} from "@/lib/catalog-upstream";

// Catalog answers are the same for every reader and change a few times a
// day, so the edge keeps them briefly instead of asking the cluster again.
const CACHE_SECONDS = 60;

/**
 * The browser's way to the catalog: the Worker adds the token the catalog
 * service requires, which never reaches the page.
 */
export const Route = createFileRoute("/api/catalog/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { baseUrl, headers } = readCatalogUpstream();

        const upstream = catalogUpstreamUrl(
          baseUrl,
          params._splat ?? "",
          new URL(request.url).search,
        );

        if (!upstream) return new Response(null, { status: 404 });

        // The key is the catalog's URL, which carries no credential.
        const key = new Request(upstream);
        const cache = await caches.open("catalog");
        const cached = await cache.match(key);

        if (cached) return cached;

        const response = await fetch(upstream, { headers });

        const answer = new Response(response.body, {
          status: response.status,
          headers: {
            "Content-Type":
              response.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": response.ok
              ? `public, max-age=${CACHE_SECONDS}`
              : "no-store",
          },
        });

        if (response.ok) await cache.put(key, answer.clone());

        return answer;
      },
    },
  },
});
