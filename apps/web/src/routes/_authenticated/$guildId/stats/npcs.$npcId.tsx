import { createFileRoute } from "@tanstack/react-router";
import { NpcDetailPageSkeleton } from "@/features/stats/npc-detail-page-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/npcs/$npcId",
)({
  pendingComponent: NpcDetailPageSkeleton,
});
