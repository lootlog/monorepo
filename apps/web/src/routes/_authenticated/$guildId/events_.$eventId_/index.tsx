import { createFileRoute } from "@tanstack/react-router";
import { EventDetail } from "@/features/events/event-detail";
import { EventDetailSkeleton } from "@/features/events/event-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/",
)({
  component: EventDetail,
  pendingComponent: EventDetailSkeleton,
});
