import { createLazyFileRoute } from "@tanstack/react-router";
import { EventEditRulebookPage } from "@/features/events/event-edit-rulebook-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/rulebook",
)({
  component: EventEditRulebookPage,
});
