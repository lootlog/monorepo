import { createFileRoute } from "@tanstack/react-router";
import { NpcKillersPage } from "@/features/stats/npc-killers-page";
import { NpcDetailPageSkeleton } from "@/features/stats/npc-detail-page-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/npcs/$npcId",
)({
  component: NpcKillersPage,
  pendingComponent: NpcDetailPageSkeleton,
});
