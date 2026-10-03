import { createFileRoute } from "@tanstack/react-router";
import { RolesSettings } from "@/features/guild/settings/roles/roles";
import { SettingsTableSkeleton } from "@/features/guild/settings/components/settings-table-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/roles")(
  {
    component: RolesSettings,
    pendingComponent: SettingsTableSkeleton,
  },
);
