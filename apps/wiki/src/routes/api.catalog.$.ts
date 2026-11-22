import { createFileRoute } from "@tanstack/react-router";
import {
  catalogUpstreamUrl,
  readCatalogUpstream,
} from "@/lib/catalog-upstream";

const CACHE_SECONDS = 60;

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
