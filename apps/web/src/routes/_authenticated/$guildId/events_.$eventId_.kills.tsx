import { createFileRoute } from "@tanstack/react-router";
import { EventKillsHistory } from "@/features/guild/events/event-kills-history";
import { EventKillsSkeleton } from "@/features/guild/events/event-kills-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/kills",
)({
  component: EventKillsHistory,
  pendingComponent: EventKillsSkeleton,
});
