import { createFileRoute } from "@tanstack/react-router";
import { portalSite } from "~/lib/llms";

export const Route = createFileRoute("/docs/{$slug}.md")({
  server: {
    handlers: {
      GET: ({ params }) => portalSite.pageMarkdownResponse(params.slug),
    },
  },
});
