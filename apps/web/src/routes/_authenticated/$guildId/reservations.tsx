import { createFileRoute } from "@tanstack/react-router";
import { ReservationsLayout } from "@/features/guild/reservations/reservations-layout/reservations-layout";
import { guildMembersQueryOptions } from "@/hooks/api/members/use-guild-members-query-options";
import { reservationsCardsQueryOptions } from "@/hooks/api/reservations/use-reservations-cards";
import { reservationsQueryOptions } from "@/hooks/api/reservations/use-reservations";

export const Route = createFileRoute("/_authenticated/$guildId/reservations")({
  loader: async ({ context, params, preload }) => {
    if (preload) {
      return null;
    }

    await Promise.all([
      context.queryClient.ensureQueryData(
        reservationsQueryOptions(params.guildId),
      ),
      context.queryClient.ensureQueryData(
        reservationsCardsQueryOptions(params.guildId),
      ),
      context.queryClient.ensureQueryData(
        guildMembersQueryOptions(params.guildId, {
          includeInactive: true,
        }),
      ),
    ]);

    return null;
  },
  component: ReservationsLayout,
});
