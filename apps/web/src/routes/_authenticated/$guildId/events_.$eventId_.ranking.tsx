import { createFileRoute } from "@tanstack/react-router";
import { EventRankingSkeleton } from "@/features/events/event-ranking-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/ranking",
)({
  pendingComponent: EventRankingSkeleton,
});
