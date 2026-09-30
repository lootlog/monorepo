import { createFileRoute } from "@tanstack/react-router";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { Init } from "@/features/init/init";
import { z } from "zod";

const initSearch = z.object({
  guild_id: z.string().trim().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/init")({
  component: Init,
  pendingComponent: FullScreenLoading,
  validateSearch: initSearch.parse,
});
