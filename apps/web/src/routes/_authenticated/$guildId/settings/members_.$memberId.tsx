import { createFileRoute } from "@tanstack/react-router";
import { MemberSettingsDetailPage } from "@/features/guild/settings/members/member-settings-detail-page";
import { MemberSettingsDetailSkeleton } from "@/features/guild/settings/members/member-settings-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/members_/$memberId",
)({
  staticData: {
    navigation: ({ t, match, parentPath, currentEntityLabel }) => ({
      ancestors: [
        {
          label: t("common.breadcrumbs.members"),
          path: `${parentPath}/members`,
        },
      ],
      label:
        currentEntityLabel ??
        t("common.breadcrumbs.memberFallback", { id: match.params?.memberId }),
    }),
  },
  component: MemberSettingsDetailPage,
  pendingComponent: MemberSettingsDetailSkeleton,
});
