import { createFileRoute } from "@tanstack/react-router";
import { portalSite } from "~/lib/llms";

export const Route = createFileRoute("/llms.txt")({
  server: { handlers: { GET: () => portalSite.llmsIndexResponse() } },
});
