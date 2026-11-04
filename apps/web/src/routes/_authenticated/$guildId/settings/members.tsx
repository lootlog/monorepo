import { createFileRoute } from "@tanstack/react-router";
import { MembersSettings } from "@/features/guild/settings/members/members";
import { MembersSettingsSkeleton } from "@/features/guild/settings/members/members-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/members",
)({
  staticData: {
    navigation: ({ t }) => ({
      label: t("common.breadcrumbs.members"),
      tab: true,
    }),
  },
  component: MembersSettings,
  pendingComponent: MembersSettingsSkeleton,
});
