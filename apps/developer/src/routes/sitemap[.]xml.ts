import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_SITE_ORIGINS, sitemapXml } from "@lootlog/domain/public-sites";
import { source } from "@/lib/source";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const paths = [
          "/",
          "/reference",
          ...source.getPages().map((page) => page.url),
        ];

        return new Response(
          sitemapXml(
            paths.map((path) => `${PUBLIC_SITE_ORIGINS.developer}${path}`),
          ),
          { headers: { "Content-Type": "application/xml; charset=utf-8" } },
        );
      },
    },
  },
});
