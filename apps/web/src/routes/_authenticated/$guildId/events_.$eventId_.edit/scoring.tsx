import { createFileRoute } from "@tanstack/react-router";
import { EventEditSkeleton } from "@/features/events/event-edit-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/scoring",
)({
  pendingComponent: EventEditSkeleton,
});
