import { createFileRoute } from "@tanstack/react-router";
import { MembersSettings } from "@/features/members-settings/members-settings";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/members"
)({
  component: MembersSettings,
});
