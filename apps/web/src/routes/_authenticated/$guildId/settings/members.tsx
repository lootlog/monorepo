import { createFileRoute } from "@tanstack/react-router";
import { MembersSettingsSkeleton } from "@/features/guild-settings/members-settings/members-settings-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/members",
)({
  pendingComponent: MembersSettingsSkeleton,
});
