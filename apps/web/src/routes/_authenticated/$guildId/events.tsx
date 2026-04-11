import { createFileRoute } from "@tanstack/react-router";
import { Events } from "@/features/guild/events/events";
import { EventsPageSkeleton } from "@/features/guild/events/events-page-skeleton";
import { eventsQueryOptions } from "@/features/guild/events/hooks/queries/use-events";

export const Route = createFileRoute("/_authenticated/$guildId/events")({
  component: Events,
  pendingComponent: EventsPageSkeleton,
  loader: async ({ context, params, preload }) => {
    if (preload) {
      return null;
    }

    await context.queryClient.ensureQueryData(
      eventsQueryOptions({
        guildId: params.guildId,
        activeOnly: false,
      }),
    );

    return null;
  },
});
