import { createFileRoute } from "@tanstack/react-router";
import { ReservationsLayout } from "@/features/guild/reservations/reservations-layout/reservations-layout";
import {
  reservationsCardsQueryOptions,
  reservationsQueryOptions,
} from "@/features/guild/reservations/reservations-api";
import { getMembersControllerGetGuildMembersQueryOptions } from "@/lib/api/generated/main/members/members";

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
        getMembersControllerGetGuildMembersQueryOptions(
          { guildId: params.guildId },
          {
            includeInactive: true,
          },
        ),
      ),
    ]);

    return null;
  },
  component: ReservationsLayout,
});
