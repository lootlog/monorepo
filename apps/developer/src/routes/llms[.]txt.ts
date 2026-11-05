import { createFileRoute } from "@tanstack/react-router";
import { markdownResponse } from "@lootlog/ui/lib/docs-markdown";
import { renderLlmsIndex } from "~/lib/llms";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () => markdownResponse(renderLlmsIndex(), "text/plain"),
    },
  },
});
