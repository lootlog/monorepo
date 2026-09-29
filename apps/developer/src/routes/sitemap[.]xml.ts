import { createFileRoute } from "@tanstack/react-router";
import { source } from "~/lib/source";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const paths = [
          "/",
          "/reference",
          ...source.getPages().map((page) => page.url),
        ];

        const urls = paths
          .map(
            (path) =>
              `<url><loc>https://developer.lootlog.pl${path}</loc></url>`,
          )
          .join("");

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
          { headers: { "Content-Type": "application/xml; charset=utf-8" } },
        );
      },
    },
  },
});
