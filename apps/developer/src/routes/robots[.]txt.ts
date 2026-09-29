import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const hostname =
          request.headers.get("host")?.split(":")[0] ??
          new URL(request.url).hostname;

        const body =
          hostname === "developer.lootlog.pl"
            ? "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /openapi/\n\nSitemap: https://developer.lootlog.pl/sitemap.xml\n"
            : "User-agent: *\nDisallow: /\n";

        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
