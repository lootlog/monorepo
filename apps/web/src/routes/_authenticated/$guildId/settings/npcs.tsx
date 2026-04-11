import { createFileRoute } from "@tanstack/react-router";
import { NpcSettings } from "@/features/guild/settings/npcs/npcs";
import { NpcSettingsSkeleton } from "@/features/guild/settings/npcs/npcs-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/npcs")({
  component: NpcSettings,
  pendingComponent: NpcSettingsSkeleton,
});
