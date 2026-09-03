import { createFileRoute } from "@tanstack/react-router";
import { Events } from "@/features/guild/events/events";
import { EventsPageSkeleton } from "@/features/guild/events/events-page-skeleton";
import { getListEventsQueryOptions } from "@lootlog/client/main";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/$guildId/events")({
  component: Events,
  pendingComponent: EventsPageSkeleton,
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void prefetchRouteQuery(
        context.queryClient,
        getListEventsQueryOptions(
          {
            guildId: params.guildId,
          },
          {
            activeOnly: "false",
          },
        ),
      );

      return null;
    }),
});
