import { createLazyFileRoute } from "@tanstack/react-router";
import { EventKillsHistory } from "@/features/events/event-kills-history";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId_/kills",
)({
  component: EventKillsHistory,
});
