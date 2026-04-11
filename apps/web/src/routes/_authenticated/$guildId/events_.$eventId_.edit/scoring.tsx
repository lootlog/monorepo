import { createFileRoute } from "@tanstack/react-router";
import { EventEditScoringPage } from "@/features/guild/events/event-edit-scoring-page";
import { EventEditSkeleton } from "@/features/guild/events/event-edit-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/scoring",
)({
  component: EventEditScoringPage,
  pendingComponent: EventEditSkeleton,
});
