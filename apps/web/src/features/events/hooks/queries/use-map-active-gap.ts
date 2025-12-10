import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { CoverageGap } from "./use-map-coverage-timer";

/**
 * Hook to fetch the active gap for a map.
 * Uses staleTime: Infinity as it only needs initial value - local timer handles updates.
 */
export const useMapActiveGap = (eventId: string, mapId: string) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery<CoverageGap | null>({
    queryKey: ["map-active-gap", guildId, eventId, mapId],
    queryFn: async () => {
      const response = await client.get<CoverageGap | null>(
        `/guilds/${guildId}/events/${eventId}/maps/${mapId}/active-gap`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId && !!mapId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
