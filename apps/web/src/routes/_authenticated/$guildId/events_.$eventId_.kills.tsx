import { createFileRoute } from "@tanstack/react-router";
import { EventKillsHistory } from "@/features/events/event-kills-history";
import { EventKillsSkeleton } from "@/features/events/event-kills-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/kills",
)({
  component: EventKillsHistory,
  pendingComponent: EventKillsSkeleton,
});
