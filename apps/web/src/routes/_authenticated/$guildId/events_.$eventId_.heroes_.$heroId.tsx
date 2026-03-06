import { createFileRoute } from "@tanstack/react-router";
import { HeroDetail } from "@/features/events/hero-detail";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId",
)({
  component: HeroDetail,
});
