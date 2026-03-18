import { createFileRoute } from "@tanstack/react-router";
import { EventRouteLayout } from "@/features/events/event-route-layout";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_",
)({
  component: EventRouteLayout,
});
