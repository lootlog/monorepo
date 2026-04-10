import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { mutationKeys, queryKeys } from "@/lib/query-keys";

export type CreateReservationInput = {
  reservationId: string;
  createdDate: Date;
  fromDate: Date;
  toDate: Date;
  createdBy: string;
  comment?: string;
};

export const useCreateReservation = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();
  const guildId = useGuildId();

  return useMutation({
    mutationKey: mutationKeys.reservations.create(guildId),
    mutationFn: async (reservation: CreateReservationInput) => {
      if (!guildId) {
        throw new Error("Missing guild id when creating reservation.");
      }

      const payload = {
        ...reservation,
        createdDate: reservation.createdDate.toISOString(),
        fromDate: reservation.fromDate.toISOString(),
        toDate: reservation.toDate.toISOString(),
      };

      const response = await client.post(
        `/guilds/${guildId}/reservations`,
        payload,
      );

      return response;
    },
    onSuccess: async () => {
      if (!guildId) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.all(guildId),
      });
    },
  });
};
