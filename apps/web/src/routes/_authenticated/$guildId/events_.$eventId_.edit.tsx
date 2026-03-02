import { createFileRoute } from "@tanstack/react-router";
import { EventEditPage } from "@/features/events/event-edit-page";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit",
)({
  component: EventEditPage,
});
