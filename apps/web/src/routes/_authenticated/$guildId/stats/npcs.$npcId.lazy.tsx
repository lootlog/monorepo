import { createLazyFileRoute } from "@tanstack/react-router";
import { NpcKillersPage } from "@/features/stats/npc-killers-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/stats/npcs/$npcId",
)({
  component: NpcKillersPage,
});
