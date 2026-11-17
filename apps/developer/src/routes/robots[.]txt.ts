import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_SITE_ORIGINS } from "@lootlog/domain/public-sites";
import { getPortalEnvironment, requestHostname } from "~/lib/environment";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const body =
          getPortalEnvironment(requestHostname(request)) === "production"
            ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /openapi/\n\nSitemap: ${PUBLIC_SITE_ORIGINS.developer}/sitemap.xml\n`
            : "User-agent: *\nDisallow: /\n";

        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
