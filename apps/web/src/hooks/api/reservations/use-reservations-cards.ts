import { useGuildId } from "@/hooks/context/use-guild-id";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useApiClient } from "../use-api-client";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ReservationCard {
  lvl: number;
  images: string[];
  maps: string[];
}

type ReservationsCardsQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const reservationsCardsQueryOptions = (
  guildId: string,
  {
    suppressRouteErrorToast = false,
  }: ReservationsCardsQueryOptionsOptions = {},
) =>
  queryOptions({
    queryKey: queryKeys.reservations.cards(guildId),
    enabled: Boolean(guildId),
    queryFn: async () => {
      const response = await apiClient.get<Record<string, ReservationCard[]>>(
        `/guilds/${guildId}/reservations/cards`,
        {
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response;
    },
    staleTime: 30_000,
  });

export const useReservationsCards = () => {
  useApiClient();
  const guildId = useGuildId();

  return useQuery(reservationsCardsQueryOptions(guildId ?? ""));
};
