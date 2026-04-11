import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { CoverageGapType } from "../utils/use-local-coverage-timer";
import { formatDurationPadded } from "../../utils";
import { queryKeys } from "@/lib/query-keys";

export { type CoverageGapType };
export { formatDurationPadded as formatDuration };

export interface CoverageGap {
  id: string;
  mapId: string;
  heroNpcId: string;
  gapType: CoverageGapType;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}

interface MapCoverageState {
  gapType: CoverageGapType | null;
  startedAt: Date | null;
  elapsedSeconds: number;
}

export const useMapCoverageTimer = (
  eventId: string,
  mapId: string,
  enabled = true,
) => {
  const guildId = useGuildId();
  const { client } = useApiClient();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { data: activeGap, isLoading } = useQuery<CoverageGap | null>({
    queryKey: queryKeys.events.mapActiveGap(guildId, eventId, mapId),
    queryFn: async () => {
      const response = await client.get<CoverageGap | null>(
        `/guilds/${guildId}/events/${eventId}/maps/${mapId}/active-gap`,
      );
      return response;
    },
    enabled: enabled && !!guildId && !!eventId && !!mapId,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const state: MapCoverageState = useMemo(() => {
    if (!activeGap) {
      return { gapType: null, startedAt: null, elapsedSeconds: 0 };
    }

    return {
      gapType: activeGap.gapType,
      startedAt: new Date(activeGap.startedAt),
      elapsedSeconds,
    };
  }, [activeGap, elapsedSeconds]);

  useEffect(() => {
    if (!activeGap?.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = new Date(activeGap.startedAt);

    const updateElapsed = () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    };

    updateElapsed();

    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeGap?.startedAt]);

  return {
    ...state,
    isLoading,
    formattedDuration: state.gapType
      ? formatDurationPadded(state.elapsedSeconds)
      : null,
  };
};

export const useHeroCoverageGaps = (eventId: string, heroId: string) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery<CoverageGap[]>({
    queryKey: queryKeys.events.heroCoverageGaps(guildId, eventId, heroId),
    queryFn: async () => {
      const response = await client.get<CoverageGap[]>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/coverage-gaps`,
      );
      return response;
    },
    enabled: !!guildId && !!eventId && !!heroId,
  });
};

export const useMapCoverageGaps = (eventId: string, mapId: string) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery<CoverageGap[]>({
    queryKey: queryKeys.events.mapCoverageGaps(guildId, eventId, mapId),
    queryFn: async () => {
      const response = await client.get<CoverageGap[]>(
        `/guilds/${guildId}/events/${eventId}/maps/${mapId}/coverage-gaps`,
      );
      return response;
    },
    enabled: !!guildId && !!eventId && !!mapId,
  });
};
