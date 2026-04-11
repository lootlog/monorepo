import { createFileRoute } from "@tanstack/react-router";
import { EventEditPage } from "@/features/guild/events/event-edit-page";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit",
)({
  component: EventEditPage,
});
