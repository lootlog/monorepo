import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { CoverageGap } from "./use-map-coverage-timer";
import { queryKeys } from "@/lib/query-keys";

export const useHeroActiveGaps = (eventId: string, heroId: string) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const query = useQuery<CoverageGap[]>({
    queryKey: queryKeys.events.heroActiveGaps(guildId, eventId, heroId),
    queryFn: async () => {
      const response = await client.get<CoverageGap[]>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/active-gaps`,
      );
      return response;
    },
    enabled: !!guildId && !!eventId && !!heroId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const activeGapsMap = useMemo(() => {
    if (!query.data) return new Map<string, CoverageGap>();
    return new Map(query.data.map((gap) => [gap.mapId, gap]));
  }, [query.data]);

  return {
    ...query,
    activeGapsMap,
  };
};
