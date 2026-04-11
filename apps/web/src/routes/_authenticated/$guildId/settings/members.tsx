import { createFileRoute } from "@tanstack/react-router";
import { MembersSettings } from "@/features/guild/settings/members/members";
import { MembersSettingsSkeleton } from "@/features/guild/settings/members/members-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/members",
)({
  component: MembersSettings,
  pendingComponent: MembersSettingsSkeleton,
});
