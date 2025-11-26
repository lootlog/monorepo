import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../use-api-client";

export interface ReservationCard {
  lvl: number;
  images: string[];
  maps: string[];
}

export const useReservationsCards = () => {
  const { client } = useApiClient();
  const guildId = useGuildId();

  return useQuery({
    queryKey: ["reservations-cards", guildId],
    enabled: Boolean(guildId),
    queryFn: async () => {
      const response = await client.get<Record<string, ReservationCard[]>>(
        `/guilds/${guildId}/reservations/cards`,
      );
      return response.data;
    },
  });
};
