import { createFileRoute } from "@tanstack/react-router";
import { markdownResponse } from "@lootlog/ui/lib/docs-markdown";
import { renderPageMarkdown } from "@/lib/llms";
import { source } from "@/lib/source";

export const Route = createFileRoute("/docs/{$slug}.md")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const page = source.getPage(
          params.slug === "index" ? [] : [params.slug],
        );

        if (!page) return new Response("Not found", { status: 404 });

        return markdownResponse(await renderPageMarkdown(page));
      },
    },
  },
});
