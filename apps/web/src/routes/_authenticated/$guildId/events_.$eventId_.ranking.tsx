import { createFileRoute } from "@tanstack/react-router";
import { EventRankingPage } from "@/features/events/event-ranking-page";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/ranking",
)({
  component: EventRankingPage,
});
