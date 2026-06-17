import { createFileRoute } from "@tanstack/react-router";
import { RoleSettingsDetailPage } from "@/features/guild/settings/roles/role-settings-detail-page";
import { RoleSettingsDetailSkeleton } from "@/features/guild/settings/roles/role-settings-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/roles_/$roleId",
)({
  component: RoleSettingsDetailPage,
  pendingComponent: RoleSettingsDetailSkeleton,
});
