import { createFileRoute } from "@tanstack/react-router";
import { Events } from "@/features/events/events";
import { EventsPageSkeleton } from "@/features/events/events-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/events")({
  component: Events,
  pendingComponent: EventsPageSkeleton,
});
