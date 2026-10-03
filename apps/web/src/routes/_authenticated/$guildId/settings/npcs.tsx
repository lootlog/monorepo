import { createFileRoute } from "@tanstack/react-router";
import { NpcSettings } from "@/features/guild/settings/npcs/npcs";
import { SettingsTableSkeleton } from "@/features/guild/settings/components/settings-table-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/npcs")({
  component: NpcSettings,
  pendingComponent: SettingsTableSkeleton,
});
