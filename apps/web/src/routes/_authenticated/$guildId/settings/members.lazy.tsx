import { createLazyFileRoute } from "@tanstack/react-router";
import { MembersSettings } from "@/features/guild-settings/members-settings/members-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/settings/members",
)({
  component: MembersSettings,
});
