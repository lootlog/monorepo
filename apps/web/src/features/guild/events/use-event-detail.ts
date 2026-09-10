import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import {
  type EventOverviewResponseDto,
  getEventsRankingControllerGetEventHeroStatsQueryKey,
  getListEventHeroTimersQueryKey,
  getListEventMapsQueryKey,
  getListEventRankingQueryKey,
  getListEventsQueryKey,
  getShowEventOverviewQueryKey,
  useDeleteEvent,
  useEventsAssignmentControllerDeleteHero,
  useEventsRankingControllerGetEventHeroStats,
  useListEventHeroTimers,
  useListEventMaps,
  useListEventRanking,
  useShowEventOverview,
  useUpdateEvent,
} from "@lootlog/client/main";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";
import { Permission } from "@lootlog/schema/permissions";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
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
import { getEventStatusAtTimestamp } from "./utils/event-activity";

import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { invalidateEventDetailQueries } from "./hooks/mutations/invalidate-event-queries";
import { useToggleEventPin } from "./hooks/mutations/use-toggle-event-pin";

type EventDetailHero = EventHeroNpc & {
  locations: EventMapLocation[];
  maps: EventMap[];
};

type EventOverview = EventOverviewResponseDto;

type Translator = ReturnType<typeof useTranslation>["t"];

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

const getEventDateRangeLabel = (
  event: EventOverview | undefined,
  t: Translator,
) => {
  if (!event) return "";

  const start = format(
    new Date(event.startsAt || event.createdAt),
    "d MMM yyyy",
    {
      locale: pl,
    },
  );

  const end = event.endsAt
    ? format(new Date(event.endsAt), "d MMM yyyy", { locale: pl })
    : t("events.ongoing");

  return `${start} - ${end}`;
};

const getEventAccess = (
  accessPolicy: ReturnType<typeof useGuildPermissions>["data"],
) => ({
  canManage: canManageEvent(accessPolicy),
  canDeleteEvent: Boolean(
    accessPolicy?.allows(Permission.ADMIN) ||
    accessPolicy?.allows(Permission.OWNER),
  ),
});

const getEventStatusView = (
  event: EventOverview | undefined,
  timestamp: number,
  eventIsPinned: boolean,
  t: Translator,
) => {
  const status = event ? getEventStatusAtTimestamp(event, timestamp) : "ended";
  let pinActionLabel = t("events.pinEvent");

  if (status !== "active") {
    pinActionLabel = t("events.pinUnavailable");
  } else if (eventIsPinned) {
    pinActionLabel = t("events.unpinEvent");
  }

  if (status === "upcoming") {
    return {
      status,
      isActive: false,
      pinActionLabel,
      statusLabel: t("events.upcoming"),
      statusVariant: "outline" as const,
    };
  }

  if (status === "active") {
    return {
      status,
      isActive: true,
      pinActionLabel,
      statusLabel: t("events.active"),
      statusVariant: "default" as const,
    };
  }

  return {
    status,
    isActive: false,
    pinActionLabel,
    statusLabel: t("events.ended"),
    statusVariant: "secondary" as const,
  };
};

const getEventScoring = (event: EventOverview | undefined) => {
  const scoringMode = normalizeEventScoringMode(event?.scoringMode);

  return {
    scoringMode,
    scoringRules:
      scoringMode === "ADVANCED"
        ? normalizeEventScoringRules(event?.scoringRules)
        : null,
  };
};

const getEventPinnedState = (
  eventId: string | undefined,
  isPinned: (eventId: string) => boolean,
) => (eventId ? isPinned(eventId) : false);

export const hasEventDetailErrors = (
  mapsError: Error | null,
  rankingError: Error | null,
) => Boolean(mapsError || rankingError);

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

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    togglePin,
    isPinned,
    isPending: isPinPending,
  } = useToggleEventPin(queryGuildId);

  const currentTimestamp = useMinuteTimestamp();
  const hasEventRouteParams = Boolean(guildId && eventId);
  const eventIsPinned = getEventPinnedState(eventId, isPinned);

  const {
    data: event,
    isLoading,
    error,
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

  const { data: rankings = [], error: rankingError } = useListEventRanking(
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

  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        if (!guildId || !eventId) {
          return;
        }

        invalidateEventDetailQueries(queryClient, guildId, eventId);
      },
    },
  });

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

  const deleteEvent = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        if (!guildId) {
          return;
        }

        queryClient.invalidateQueries({
          queryKey: getListEventsQueryKey({ guildId }),
        });
      },
    },
  });

  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  const [selectedHero, setSelectedHero] = useState<EventDetailHero | null>(
    null,
  );

  const heroes = getEventHeroes(event, eventMaps);
  const { scoringMode, scoringRules } = getEventScoring(event);
  const eventDateRangeLabel = getEventDateRangeLabel(event, t);
  const { canManage, canDeleteEvent } = getEventAccess(accessPolicy);

  const {
    isActive: isEventActive,
    pinActionLabel,
    statusLabel: eventStatusLabel,
    statusVariant: eventStatusVariant,
  } = getEventStatusView(event, currentTimestamp, eventIsPinned, t);

  const handleEditHero = (hero: EventHeroNpc) => {
    setSelectedHero({
      ...hero,
      locations: hero.locations ?? [],
      maps: hero.maps ?? [],
    });
    setHeroDialogOpen(true);
  };

  const handleManageMaps = (hero: EventHeroNpc) => {
    setSelectedHero({
      ...hero,
      locations: hero.locations ?? [],
      maps: hero.maps ?? [],
    });
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

  const navigateToEventEdit = () => {
    navigate({
      to: "/$guildId/events/$eventId/edit",
      params: {
        guildId: queryGuildId,
        eventId: queryEventId,
      },
    });
  };

  const openEventStatusDialog = () => {
    if (isEventActive) {
      setEndDialogOpen(true);

      return;
    }

    setResumeDialogOpen(true);
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
    endDialogOpen,
    setEndDialogOpen,
    updateEvent,
    t,
    error,
    resumeDialogOpen,
    setResumeDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteEvent,
    navigate,
    rulesDialogOpen,
    setRulesDialogOpen,
    scoringMode,
    scoringRules,
    summaryDialogOpen,
    setSummaryDialogOpen,
    eventStatusVariant,
    eventStatusLabel,
    eventDateRangeLabel,
    isPinPending,
    eventIsPinned,
    pinActionLabel,
    isEventActive,
    togglePin,
    canManage,
    canDeleteEvent,
    navigateToEventEdit,
    openEventStatusDialog,
    mapsError,
    rankingError,
    heroes,
    heroTimers,
    heroStats,
    setSelectedHero,
    handleEditHero,
    handleManageMaps,
    handleDeleteHero,
    rankings,
    isLoading,
    isMapsLoading,
  };
};
