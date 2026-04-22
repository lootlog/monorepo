import { createFileRoute } from "@tanstack/react-router";
import { Events } from "@/features/guild/events/events";
import { EventsPageSkeleton } from "@/features/guild/events/events-page-skeleton";
import { getListEventsQueryOptions } from "@/lib/api/generated/main/events/events";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/$guildId/events")({
  component: Events,
  pendingComponent: EventsPageSkeleton,
  loader: ({ context, params, preload }) =>
    withRouteLoaderCancellation(async () => {
      if (preload) {
        return null;
      }

      await context.queryClient.ensureQueryData(
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
