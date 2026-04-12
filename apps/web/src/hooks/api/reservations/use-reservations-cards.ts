import { useGuildId } from "@/hooks/context/use-guild-id";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ReservationCard {
  lvl: number;
  images: string[];
  maps: string[];
}

export const reservationsCardsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: queryKeys.reservations.cards(guildId),
    enabled: Boolean(guildId),
    queryFn: () =>
      apiClient.get<Record<string, ReservationCard[]>>(
        `/guilds/${guildId}/reservations/cards`,
      ),
    staleTime: 30_000,
  });

export const useReservationsCards = () => {
  const guildId = useGuildId();

  return useQuery(reservationsCardsQueryOptions(guildId ?? ""));
};
