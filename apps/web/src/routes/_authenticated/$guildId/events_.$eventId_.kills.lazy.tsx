import { createLazyFileRoute } from "@tanstack/react-router";
import { EventKillsHistory } from "@/features/events/event-kills-history";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/kills",
)({
  component: EventKillsHistory,
});
