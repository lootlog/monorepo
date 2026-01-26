import { createFileRoute } from "@tanstack/react-router";
import { EventDetail } from "@/features/events/event-detail";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId",
)({
  component: EventDetail,
});
