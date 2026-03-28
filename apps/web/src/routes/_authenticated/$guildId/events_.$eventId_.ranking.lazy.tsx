import { createLazyFileRoute } from "@tanstack/react-router";
import { EventRankingPage } from "@/features/events/event-ranking-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/ranking",
)({
  component: EventRankingPage,
});
