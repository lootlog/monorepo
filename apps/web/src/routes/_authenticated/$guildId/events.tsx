import { createFileRoute } from "@tanstack/react-router";
import { Events } from "@/features/events/events";
import { EventsPageSkeleton } from "@/features/events/events-page-skeleton";
import { eventsQueryOptions } from "@/features/events/hooks/queries/use-events";

export const Route = createFileRoute("/_authenticated/$guildId/events")({
  component: Events,
  pendingComponent: EventsPageSkeleton,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      eventsQueryOptions({
        guildId: params.guildId,
        activeOnly: false,
      }),
    );

    return null;
  },
});
