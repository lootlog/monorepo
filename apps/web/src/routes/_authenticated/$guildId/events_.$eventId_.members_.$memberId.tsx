import { createFileRoute } from "@tanstack/react-router";
import { EventMemberSkeleton } from "@/features/events/event-member-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/members_/$memberId",
)({
  pendingComponent: EventMemberSkeleton,
});
