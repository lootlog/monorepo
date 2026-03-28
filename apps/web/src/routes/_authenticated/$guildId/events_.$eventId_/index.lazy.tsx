import { createLazyFileRoute } from "@tanstack/react-router";
import { EventDetail } from "@/features/events/event-detail";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/",
)({
  component: EventDetail,
});
