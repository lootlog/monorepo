import { createFileRoute } from "@tanstack/react-router";
import { EventsPageSkeleton } from "@/features/events/events-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/events")({
  pendingComponent: EventsPageSkeleton,
});
