import { createFileRoute } from "@tanstack/react-router";
import { HeroKillsHistory } from "@/features/events/hero-kills-history";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId_/kills",
)({
  component: HeroKillsHistory,
});
