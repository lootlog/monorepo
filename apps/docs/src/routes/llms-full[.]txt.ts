import { createFileRoute } from "@tanstack/react-router";
import { docsSite } from "@/lib/llms";

export const Route = createFileRoute("/llms-full.txt")({
  server: { handlers: { GET: () => docsSite.llmsFullResponse() } },
});
