import { createFileRoute } from "@tanstack/react-router";
import { HeroDetail } from "@/features/guild/events/hero-detail";
import { EventHeroSkeleton } from "@/features/guild/events/event-hero-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId",
)({
  component: HeroDetail,
  pendingComponent: EventHeroSkeleton,
});
