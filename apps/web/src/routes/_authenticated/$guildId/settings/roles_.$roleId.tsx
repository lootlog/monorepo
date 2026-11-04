import { createFileRoute } from "@tanstack/react-router";
import { RoleSettingsDetailPage } from "@/features/guild/settings/roles/role-settings-detail-page";
import { RoleSettingsDetailSkeleton } from "@/features/guild/settings/roles/role-settings-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/roles_/$roleId",
)({
  staticData: {
    navigation: ({ t, match, parentPath, currentEntityLabel }) => ({
      ancestors: [
        { label: t("common.breadcrumbs.roles"), path: `${parentPath}/roles` },
      ],
      label:
        currentEntityLabel ??
        t("common.breadcrumbs.roleFallback", { id: match.params?.roleId }),
    }),
  },
  component: RoleSettingsDetailPage,
  pendingComponent: RoleSettingsDetailSkeleton,
});
