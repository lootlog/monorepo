import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { CoverageGapType } from "../utils/use-local-coverage-timer";
import { formatDurationPadded } from "../../utils";

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
    queryKey: ["map-active-gap", guildId, eventId, mapId],
    queryFn: async () => {
      const response = await client.get<CoverageGap | null>(
        `/guilds/${guildId}/events/${eventId}/maps/${mapId}/active-gap`,
      );
      return response.data;
    },
    enabled: enabled && !!guildId && !!eventId && !!mapId,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const state: MapCoverageState = (() => {
    if (!activeGap) {
      return { gapType: null, startedAt: null, elapsedSeconds: 0 };
    }

    return {
      gapType: activeGap.gapType,
      startedAt: new Date(activeGap.startedAt),
      elapsedSeconds,
    };
  })();

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
    queryKey: ["hero-coverage-gaps", guildId, eventId, heroId],
    queryFn: async () => {
      const response = await client.get<CoverageGap[]>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/coverage-gaps`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId && !!heroId,
  });
};

export const useMapCoverageGaps = (eventId: string, mapId: string) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery<CoverageGap[]>({
    queryKey: ["map-coverage-gaps", guildId, eventId, mapId],
    queryFn: async () => {
      const response = await client.get<CoverageGap[]>(
        `/guilds/${guildId}/events/${eventId}/maps/${mapId}/coverage-gaps`,
      );
      return response.data;
    },
    enabled: !!guildId && !!eventId && !!mapId,
  });
};
