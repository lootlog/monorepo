import { createLazyFileRoute } from "@tanstack/react-router";
import { KillDetail } from "@/features/events/kill-detail";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId_/kills_/$killId",
)({
  component: KillDetail,
});
