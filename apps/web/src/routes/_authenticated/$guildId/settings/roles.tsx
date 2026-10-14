import { createFileRoute } from "@tanstack/react-router";
import { RolesSettings } from "@/features/guild/settings/roles/roles";
import { SettingsListSkeleton } from "@/features/guild/settings/components/settings-list-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/roles")(
  {
    component: RolesSettings,
    pendingComponent: SettingsListSkeleton,
  },
);
