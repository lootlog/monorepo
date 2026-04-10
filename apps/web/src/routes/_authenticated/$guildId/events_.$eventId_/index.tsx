import { createFileRoute } from "@tanstack/react-router";
import { EventDetailSkeleton } from "@/features/events/event-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/",
)({
  pendingComponent: EventDetailSkeleton,
});
