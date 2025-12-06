import { NpcSettings } from "@/features/guild-settings/lootlog-settings/npc-settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$guildId/settings/npcs")({
  component: NpcSettings,
});
