import { createFileRoute } from "@tanstack/react-router";
import { EventRankingPage } from "@/features/events/event-ranking-page";
import { EventRankingSkeleton } from "@/features/events/event-ranking-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/ranking",
)({
  component: EventRankingPage,
  pendingComponent: EventRankingSkeleton,
});
