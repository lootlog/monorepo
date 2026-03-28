import { createLazyFileRoute } from "@tanstack/react-router";
import { EventMemberKillsPage } from "@/features/events/event-member-kills-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/members_/$memberId",
)({
  component: EventMemberKillsPage,
});
