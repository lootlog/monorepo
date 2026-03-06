import { createFileRoute } from "@tanstack/react-router";
import { EventMemberKillsPage } from "@/features/events/event-member-kills-page";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/members_/$memberId",
)({
  component: EventMemberKillsPage,
});
