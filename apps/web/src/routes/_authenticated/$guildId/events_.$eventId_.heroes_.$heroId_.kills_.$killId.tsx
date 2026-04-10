import { createFileRoute } from "@tanstack/react-router";
import { EventKillDetailSkeleton } from "@/features/events/event-kill-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId_/kills_/$killId",
)({
  pendingComponent: EventKillDetailSkeleton,
});
