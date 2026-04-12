import { createFileRoute } from "@tanstack/react-router";
import { EventRouteLayout } from "@/features/guild/events/event-route-layout";
import {
  getListEventRankingQueryOptions,
  getShowEventOverviewQueryOptions,
} from "@/lib/api/generated/main/events/events";
import {
  isRouteLoaderCancelledError,
  throwNotFoundIfResponseMatches,
} from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_",
)({
  component: EventRouteLayout,
  loader: async ({ context, params }) => {
    try {
      const [event, rankings] = await Promise.all([
        context.queryClient.ensureQueryData(
          getShowEventOverviewQueryOptions({
            guildId: params.guildId,
            eventId: params.eventId,
          }),
        ),
        context.queryClient.ensureQueryData(
          getListEventRankingQueryOptions({
            guildId: params.guildId,
            eventId: params.eventId,
          }),
        ),
      ]);

      return {
        event,
        rankings,
      };
    } catch (error) {
      if (isRouteLoaderCancelledError(error)) {
        return;
      }

      throwNotFoundIfResponseMatches(error);
    }
  },
});
