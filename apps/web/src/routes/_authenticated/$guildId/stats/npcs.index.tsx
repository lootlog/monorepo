import { createFileRoute } from "@tanstack/react-router";
import { NpcsIndexPageSkeleton } from "@/features/stats/npcs-index-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/npcs/")({
  pendingComponent: NpcsIndexPageSkeleton,
});
