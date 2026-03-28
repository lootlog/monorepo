import { createLazyFileRoute } from "@tanstack/react-router";
import { EventEditScoringPage } from "@/features/events/event-edit-scoring-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/scoring",
)({
  component: EventEditScoringPage,
});
