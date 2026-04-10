import { createFileRoute } from "@tanstack/react-router";
import { RolesSettings } from "@/features/guild-settings/roles-settings/roles-settings";
import { RolesSettingsSkeleton } from "@/features/guild-settings/roles-settings/roles-settings-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/roles/$roleId",
)({
  component: RolesSettings,
  pendingComponent: RolesSettingsSkeleton,
});
