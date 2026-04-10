import { createFileRoute } from "@tanstack/react-router";
import { EventKillsSkeleton } from "@/features/events/event-kills-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/kills",
)({
  pendingComponent: EventKillsSkeleton,
});
