import { createFileRoute } from "@tanstack/react-router";
import { EventEditRulebookPage } from "@/features/guild/events/event-edit-rulebook-page";
import { EventEditSkeleton } from "@/features/guild/events/event-edit-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/rulebook",
)({
  component: EventEditRulebookPage,
  pendingComponent: EventEditSkeleton,
});
