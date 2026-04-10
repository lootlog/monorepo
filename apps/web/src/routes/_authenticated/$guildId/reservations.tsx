import { createFileRoute } from "@tanstack/react-router";
import { ReservationsLayout } from "@/features/reservations/reservations-layout/reservations-layout";
import { guildMembersQueryOptions } from "@/hooks/api/members/use-guild-members-query-options";
import { reservationsCardsQueryOptions } from "@/hooks/api/reservations/use-reservations-cards";
import { reservationsQueryOptions } from "@/hooks/api/reservations/use-reservations";

export const Route = createFileRoute("/_authenticated/$guildId/reservations")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        reservationsQueryOptions(params.guildId, {
          suppressRouteErrorToast: true,
        }),
      ),
      context.queryClient.ensureQueryData(
        reservationsCardsQueryOptions(params.guildId, {
          suppressRouteErrorToast: true,
        }),
      ),
      context.queryClient.ensureQueryData(
        guildMembersQueryOptions(params.guildId, {
          includeInactive: true,
          suppressRouteErrorToast: true,
        }),
      ),
    ]);

    return null;
  },
  component: ReservationsLayout,
});
