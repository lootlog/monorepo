import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  eventsMonitoringControllerGetActiveGapForMap,
  eventsMonitoringControllerGetHeroCoverageGaps,
  eventsMonitoringControllerGetMapCoverageGaps,
} from "@/lib/api/generated/main/events/events";
import type {
  CoverageGapResponseDto,
  CoverageGapResponseDtoGapType,
  HeroCoverageGapResponseDto,
} from "@/lib/api/generated/main/model";
import { formatDurationPadded } from "../../utils";
import { queryKeys } from "@/lib/query-keys";

export { formatDurationPadded as formatDuration };

type CoverageGapType = CoverageGapResponseDtoGapType;

export type CoverageGap = CoverageGapResponseDto;

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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { data: activeGap, isLoading } = useQuery<CoverageGap | null>({
    queryKey: queryKeys.events.mapActiveGap(guildId, eventId, mapId),
    queryFn: () =>
      eventsMonitoringControllerGetActiveGapForMap({
        guildId: guildId ?? "",
        eventId,
        mapId,
      }) as Promise<CoverageGap | null>,
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

  return useQuery<HeroCoverageGapResponseDto[]>({
    queryKey: queryKeys.events.heroCoverageGaps(guildId, eventId, heroId),
    queryFn: () =>
      eventsMonitoringControllerGetHeroCoverageGaps({
        guildId: guildId ?? "",
        eventId,
        heroId,
      }),
    enabled: !!guildId && !!eventId && !!heroId,
  });
};

export const useMapCoverageGaps = (eventId: string, mapId: string) => {
  const guildId = useGuildId();

  return useQuery<CoverageGap[]>({
    queryKey: queryKeys.events.mapCoverageGaps(guildId, eventId, mapId),
    queryFn: () =>
      eventsMonitoringControllerGetMapCoverageGaps({
        guildId: guildId ?? "",
        eventId,
        mapId,
      }) as Promise<CoverageGap[]>,
    enabled: !!guildId && !!eventId && !!mapId,
  });
};
