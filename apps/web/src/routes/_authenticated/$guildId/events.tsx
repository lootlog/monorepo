import { createFileRoute } from "@tanstack/react-router";
import { Events } from "@/features/guild/events/events";
import { EventsPageSkeleton } from "@/features/guild/events/events-page-skeleton";
import { getListEventsQueryOptions } from "@/lib/api/generated/main/events/events";
import { isRouteLoaderCancelledError } from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/$guildId/events")({
  component: Events,
  pendingComponent: EventsPageSkeleton,
  loader: async ({ context, params, preload }) => {
    if (preload) {
      return null;
    }

    try {
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
    } catch (error) {
      if (isRouteLoaderCancelledError(error)) {
        return null;
      }

      throw error;
    }

    return null;
  },
});
