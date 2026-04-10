import { createFileRoute } from "@tanstack/react-router";
import { RolesSettingsSkeleton } from "@/features/guild-settings/roles-settings/roles-settings-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/roles/$roleId",
)({
  pendingComponent: RolesSettingsSkeleton,
});
