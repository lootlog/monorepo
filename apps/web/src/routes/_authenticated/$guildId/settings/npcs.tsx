import { createFileRoute } from "@tanstack/react-router";
import { NpcSettings } from "@/features/lootlog-settings/npc-settings";

export const Route = createFileRoute("/_authenticated/$guildId/settings/npcs")({
  component: NpcSettings,
});
