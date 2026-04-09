import { createFileRoute } from "@tanstack/react-router";
import { EventEditScoringPage } from "@/features/events/event-edit-scoring-page";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/scoring",
)({
  component: EventEditScoringPage,
});
