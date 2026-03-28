import { createLazyFileRoute } from "@tanstack/react-router";
import { EventRouteLayout } from "@/features/events/event-route-layout";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_",
)({
  component: EventRouteLayout,
});
