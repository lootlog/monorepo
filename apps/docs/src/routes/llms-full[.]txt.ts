import { createFileRoute } from "@tanstack/react-router";
import { markdownResponse } from "@lootlog/ui/lib/docs-markdown";
import { renderLlmsFull } from "@/lib/llms";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () => markdownResponse(await renderLlmsFull(), "text/plain"),
    },
  },
});
