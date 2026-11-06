import { createFileRoute } from "@tanstack/react-router";
import { prefetchEventDetailQueries } from "@/features/guild/events/event-route-prefetch";
import { EventDetail } from "@/features/guild/events/event-detail";
import { EventDetailSkeleton } from "@/features/guild/events/event-detail-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/",
)({
  component: EventDetail,
  loader: ({ context, params }) => {
    prefetchEventDetailQueries(
      context.queryClient,
      { guildId: params.guildId, eventId: params.eventId },
      { heroStats: true },
    );

    return null;
  },
  pendingComponent: EventDetailSkeleton,
});
