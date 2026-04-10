import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { mutationKeys, queryKeys } from "@/lib/query-keys";

export type DeleteReservationInput = {
  reservationRecordId: number;
};

export const useDeleteReservation = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();
  const guildId = useGuildId();

  return useMutation({
    mutationKey: mutationKeys.reservations.delete(guildId),
    mutationFn: async ({ reservationRecordId }: DeleteReservationInput) => {
      if (!guildId) {
        throw new Error("Missing guild id when deleting reservation.");
      }

      await client.delete(
        `/guilds/${guildId}/reservations/${reservationRecordId}`,
      );
    },
    onSuccess: async () => {
      if (!guildId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.all(guildId),
      });
    },
  });
};
