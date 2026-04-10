import { createFileRoute } from "@tanstack/react-router";
import { NpcSettings } from "@/features/guild-settings/lootlog-settings/npc-settings";
import { NpcSettingsSkeleton } from "@/features/guild-settings/lootlog-settings/npc-settings-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/npcs")({
  component: NpcSettings,
  pendingComponent: NpcSettingsSkeleton,
});
