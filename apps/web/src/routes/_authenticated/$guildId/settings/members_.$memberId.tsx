import { createFileRoute } from "@tanstack/react-router";
import { MemberSettingsDetailPage } from "@/features/guild/settings/members/member-settings-detail-page";
import { MemberSettingsDetailSkeleton } from "@/features/guild/settings/members/member-settings-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/members_/$memberId",
)({
  component: MemberSettingsDetailPage,
  pendingComponent: MemberSettingsDetailSkeleton,
});
