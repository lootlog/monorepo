import { useGuildId } from "@/hooks/context/use-guild-id";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useApiClient } from "../use-api-client";
import { apiClient } from "@/lib/api-client/api-client";

export interface ReservationCard {
  lvl: number;
  images: string[];
  maps: string[];
}

export const reservationsCardsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: ["reservations-cards", guildId],
    enabled: Boolean(guildId),
    queryFn: async () => {
      const response = await apiClient.get<Record<string, ReservationCard[]>>(
        `/guilds/${guildId}/reservations/cards`,
      );
      return response.data;
    },
    staleTime: 30_000,
  });

export const useReservationsCards = () => {
  useApiClient();
  const guildId = useGuildId();

  return useQuery(reservationsCardsQueryOptions(guildId ?? ""));
};
