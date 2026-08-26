import {
  getListReservationSpotsQueryKey,
  getListReservationSpotsQueryOptions,
  getListSpotReservationsQueryOptions,
} from "@lootlog/api-client/react-query/main/reservations";

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

export const reservationWindowQueryOptions = (
  guildId: string,
  spotId: string,
  from: Date,
  to: Date,
) =>
  getListSpotReservationsQueryOptions(
    { guildId, spotId },
    { from: from.toISOString(), to: to.toISOString() },
    {
      query: {
        enabled: Boolean(guildId && spotId),
        staleTime: 15_000,
      },
    },
  );
