import { createFileRoute } from "@tanstack/react-router";
import { RolesSettings } from "@/features/guild/settings/roles/roles";
import { RolesSettingsSkeleton } from "@/features/guild/settings/roles/roles-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/roles")(
  {
    component: RolesSettings,
    pendingComponent: RolesSettingsSkeleton,
  },
);
