import { createFileRoute } from "@tanstack/react-router";
import { NpcKillersPage } from "@/features/stats/npc-killers-page";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/npcs/$npcId",
)({
  component: NpcKillersPage,
});
