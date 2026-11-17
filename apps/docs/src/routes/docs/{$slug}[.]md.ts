import { createFileRoute } from "@tanstack/react-router";
import { docsSite } from "@/lib/llms";

export const Route = createFileRoute("/docs/{$slug}.md")({
  server: {
    handlers: {
      GET: ({ params }) => docsSite.pageMarkdownResponse(params.slug),
    },
  },
});
