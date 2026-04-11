import { createFileRoute } from "@tanstack/react-router";
import { EventMemberKillsPage } from "@/features/guild/events/event-member-kills-page";
import { EventMemberSkeleton } from "@/features/guild/events/event-member-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/members_/$memberId",
)({
  component: EventMemberKillsPage,
  pendingComponent: EventMemberSkeleton,
});
