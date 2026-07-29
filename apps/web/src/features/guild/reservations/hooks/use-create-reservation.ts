import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateReservationsControllerGetReservations,
  useReservationsControllerCreateReservation,
} from "@lootlog/api-client/react-query/main/reservations";
import {
  getOptimisticReservationId,
  getReservationsCacheSnapshot,
  replaceReservationInReservationsCache,
  reservationsCacheQueryKey,
  restoreReservationsCacheSnapshot,
  upsertReservationInReservationsCache,
  type ReservationsCacheMutationContext,
} from "../reservations-api";

export function useCreateReservation(guildId: string | undefined) {
  const queryClient = useQueryClient();

  return useReservationsControllerCreateReservation<
    unknown,
    ReservationsCacheMutationContext
  >({
    mutation: {
      onMutate: async (variables) => {
        if (!guildId) {
          return { previousReservations: undefined };
        }

        await queryClient.cancelQueries({
          queryKey: reservationsCacheQueryKey(guildId),
        });

        const previousReservations = getReservationsCacheSnapshot(
          queryClient,
          guildId,
        );
        const optimisticReservationId = getOptimisticReservationId();

        upsertReservationInReservationsCache(queryClient, guildId, {
          id: optimisticReservationId,
          reservationId: variables.data.reservationId,
          createdDate: variables.data.createdDate,
          fromDate: variables.data.fromDate,
          toDate: variables.data.toDate,
          createdBy: variables.data.createdBy,
          comment: variables.data.comment ?? null,
        });

        return { previousReservations, optimisticReservationId };
      },
      onSuccess: async (reservation, _variables, mutationContext) => {
        if (!guildId) {
          return;
        }

        if (mutationContext?.optimisticReservationId) {
          replaceReservationInReservationsCache(
            queryClient,
            guildId,
            mutationContext.optimisticReservationId,
            reservation,
          );
        } else {
          upsertReservationInReservationsCache(
            queryClient,
            guildId,
            reservation,
          );
        }

        await invalidateReservationsControllerGetReservations(queryClient, {
          guildId,
        });
      },
      onError: (_error, _variables, mutationContext) => {
        if (!guildId) {
          return;
        }

        restoreReservationsCacheSnapshot(
          queryClient,
          guildId,
          mutationContext?.previousReservations,
        );
      },
    },
  });
}
