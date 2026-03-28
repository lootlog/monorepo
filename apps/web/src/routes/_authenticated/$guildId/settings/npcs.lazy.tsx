import { createLazyFileRoute } from "@tanstack/react-router";
import { NpcSettings } from "@/features/guild-settings/lootlog-settings/npc-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/settings/npcs",
)({
  component: NpcSettings,
});
