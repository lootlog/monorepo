import type { QueryClient } from "@tanstack/react-query";
import {
  getListReservationSpotsQueryKey,
  getListSpotReservationsQueryKey,
} from "@lootlog/client/main";

export const invalidateReservationQueries = (
  queryClient: QueryClient,
  guildId: string,
  spotId: string,
) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: getListReservationSpotsQueryKey({ guildId }),
    }),
    queryClient.invalidateQueries({
      queryKey: getListSpotReservationsQueryKey({ guildId, spotId }),
    }),
  ]);
