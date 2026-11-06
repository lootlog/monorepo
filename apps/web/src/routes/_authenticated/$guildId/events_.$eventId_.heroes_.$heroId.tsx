import { createFileRoute } from "@tanstack/react-router";
import { prefetchEventDetailQueries } from "@/features/guild/events/event-route-prefetch";
import { HeroDetail } from "@/features/guild/events/hero-detail";
import { EventHeroSkeleton } from "@/features/guild/events/event-hero-skeleton";
import { getEventHeroBreadcrumb } from "@/features/guild/events/event-route-navigation";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId",
)({
  staticData: {
    navigation: (context) => ({
      label: getEventHeroBreadcrumb(context).label,
    }),
  },
  component: HeroDetail,
  loader: ({ context, params }) => {
    prefetchEventDetailQueries(
      context.queryClient,
      { guildId: params.guildId, eventId: params.eventId },
      { heroStats: false },
    );

    return null;
  },
  pendingComponent: EventHeroSkeleton,
});
