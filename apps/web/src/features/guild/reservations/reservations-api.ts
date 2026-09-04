import {
  getListReservationSpotsQueryKey,
  getListReservationSpotsQueryOptions,
} from "@lootlog/client/main";

export const reservationSpotsQueryOptions = (guildId: string) =>
  getListReservationSpotsQueryOptions(
    { guildId },
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getListReservationSpotsQueryKey({ guildId }),
        staleTime: 30_000,
      },
    },
  );
