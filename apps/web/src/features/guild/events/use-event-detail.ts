import {
  type EventOverviewResponseDto,
  getEventsRankingControllerGetEventHeroStatsQueryKey,
  getListEventHeroTimersQueryKey,
  getListEventMapsQueryKey,
  getListEventRankingQueryKey,
  getShowEventOverviewQueryKey,
  useEventsAssignmentControllerDeleteHero,
  useEventsRankingControllerGetEventHeroStats,
  useListEventHeroTimers,
  useListEventMaps,
  useListEventRanking,
  useShowEventOverview,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  EventHeroNpc,
  EventMap,
  EventMapLocation,
  EventMapsResponse,
} from "./types/api";
import { canManageEvent } from "./utils/event-access";

import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { invalidateEventDetailQueries } from "./hooks/mutations/invalidate-event-queries";

type EventDetailHero = EventHeroNpc & {
  locations: EventMapLocation[];
  maps: EventMap[];
};

type EventOverview = EventOverviewResponseDto;

const getEventHeroes = (
  event: EventOverview | undefined,
  eventMaps: EventMapsResponse | undefined,
): EventDetailHero[] => {
  const heroMapsById = new Map(
    (eventMaps?.heroNpcs ?? []).map((hero) => [hero.id, hero]),
  );

  return (event?.heroNpcs ?? []).map((hero) => {
    const mapsData = heroMapsById.get(hero.id);

    return {
      ...hero,
      locations: mapsData?.locations ?? [],
      maps: mapsData?.maps ?? [],
    };
  });
};

const getEventRouteQuery = (
  guildId: string | undefined,
  eventId: string | undefined,
) => ({
  guildId: guildId ?? "",
  eventId: eventId ?? "",
});

const getEventHeroTimerQuery = (world: string | null | undefined) => ({
  world: world ?? "",
});

export const useEventDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });

  const { guildId: queryGuildId, eventId: queryEventId } = getEventRouteQuery(
    guildId,
    eventId,
  );

  const queryClient = useQueryClient();
  const hasEventRouteParams = Boolean(guildId && eventId);

  const {
    data: event,
    isLoading,
    error,
    refetch: refetchEvent,
  } = useShowEventOverview(
    {
      guildId: queryGuildId,
      eventId: queryEventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getShowEventOverviewQueryKey({
          guildId: queryGuildId,
          eventId: queryEventId,
        }),
      },
    },
  );

  const {
    data: eventMaps,
    isLoading: isMapsLoading,
    error: mapsError,
    refetch: refetchMaps,
    isFetching: isMapsFetching,
  } = useListEventMaps(
    {
      guildId: queryGuildId,
      eventId: queryEventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getListEventMapsQueryKey({
          guildId: queryGuildId,
          eventId: queryEventId,
        }),
      },
    },
  );

  const { data: accessPolicy } = useGuildPermissions();

  const { data: heroTimers } = useListEventHeroTimers(
    {
      guildId: queryGuildId,
      eventId: queryEventId,
    },
    getEventHeroTimerQuery(event?.world),
    {
      query: {
        enabled: hasEventRouteParams && Boolean(event?.world),
        queryKey: getListEventHeroTimersQueryKey(
          {
            guildId: queryGuildId,
            eventId: queryEventId,
          },
          getEventHeroTimerQuery(event?.world),
        ),
      },
    },
  );

  const { data: heroStats } = useEventsRankingControllerGetEventHeroStats(
    {
      guildId: queryGuildId,
      eventId: queryEventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getEventsRankingControllerGetEventHeroStatsQueryKey({
          guildId: queryGuildId,
          eventId: queryEventId,
        }),
      },
    },
  );

  const {
    data: rankings = [],
    error: rankingError,
    refetch: refetchRanking,
    isFetching: isRankingFetching,
  } = useListEventRanking(
    {
      guildId: queryGuildId,
      eventId: queryEventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getListEventRankingQueryKey({
          guildId: queryGuildId,
          eventId: queryEventId,
        }),
      },
    },
  );

  const deleteHero = useEventsAssignmentControllerDeleteHero({
    mutation: {
      onSuccess: () => {
        if (!guildId || !eventId) {
          return;
        }

        invalidateEventDetailQueries(queryClient, guildId, eventId);
      },
    },
  });

  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  const heroes = getEventHeroes(event, eventMaps);

  const selectedHero =
    heroes.find((hero) => hero.id === selectedHeroId) ?? null;

  if (selectedHeroId !== null && !selectedHero) {
    setSelectedHeroId(null);
    setHeroDialogOpen(false);
    setMapDialogOpen(false);
  }

  const canManage = canManageEvent(accessPolicy);

  const handleEditHero = (hero: EventHeroNpc) => {
    setSelectedHeroId(hero.id);
    setHeroDialogOpen(true);
  };

  const handleManageMaps = (hero: EventHeroNpc) => {
    setSelectedHeroId(hero.id);
    setMapDialogOpen(true);
  };

  const handleDeleteHero = async (heroId: string) => {
    try {
      await deleteHero.mutateAsync({
        pathParams: {
          guildId: queryGuildId,
          eventId: queryEventId,
          heroId,
        },
      });
      toast.success(t("events.heroes.deleted"));
    } catch {
      toast.error(t("events.heroes.deleteError"));
    }
  };

  return {
    guildId,
    eventId,
    event,
    heroDialogOpen,
    setHeroDialogOpen,
    queryGuildId,
    queryEventId,
    selectedHero,
    mapDialogOpen,
    setMapDialogOpen,
    t,
    error,
    canManage,
    refetchEvent,
    mapsError,
    rankingError,
    refetchMaps,
    refetchRanking,
    isMapsFetching,
    isRankingFetching,
    heroes,
    heroTimers,
    heroStats,
    setSelectedHeroId,
    handleEditHero,
    handleManageMaps,
    handleDeleteHero,
    isDeleteHeroPending: deleteHero.isPending,
    rankings,
    isLoading,
    isMapsLoading,
  };
};
