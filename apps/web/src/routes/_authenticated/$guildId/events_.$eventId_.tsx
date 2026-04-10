import { createFileRoute } from "@tanstack/react-router";
import { EventRouteLayout } from "@/features/events/event-route-layout";
import { eventOverviewQueryOptions } from "@/features/events/hooks/queries/use-event-overview";
import { eventRankingQueryOptions } from "@/features/events/hooks/queries/use-event-ranking";
import { throwNotFoundIfResponseMatches } from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_",
)({
  component: EventRouteLayout,
  loader: async ({ context, params }) => {
    try {
      const [event, rankings] = await Promise.all([
        context.queryClient.ensureQueryData(
          eventOverviewQueryOptions({
            guildId: params.guildId,
            eventId: params.eventId,
            suppressRouteErrorToast: true,
          }),
        ),
        context.queryClient.ensureQueryData(
          eventRankingQueryOptions({
            guildId: params.guildId,
            eventId: params.eventId,
            suppressRouteErrorToast: true,
          }),
        ),
      ]);

      return {
        event,
        rankings,
      };
    } catch (error) {
      throwNotFoundIfResponseMatches(error);
    }
  },
});
