import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  type EventOverviewResponseDto as EventOverview,
  getEventsMonitoringControllerGetActiveGapsForHeroQueryKey,
  getGuildsControllerGetGuildByIdQueryKey,
  getListEventHeroTimersQueryKey,
  getListEventMapsQueryKey,
  getListEventRankingQueryKey,
  getMembersControllerGetMeQueryKey,
  getShowEventOverviewQueryKey,
  useEventsAssignmentControllerAssignMember,
  useEventsAssignmentControllerSelfAssignMember,
  useEventsAssignmentControllerSelfUnassignMember,
  useEventsAssignmentControllerUnassignMember,
  useEventsMonitoringControllerCloseRespawnWindow,
  useEventsMonitoringControllerGetActiveGapsForHero,
  useEventsMonitoringControllerOpenRespawnWindow,
  useGuildsControllerGetGuildById,
  useListEventHeroTimers,
  useListEventMaps,
  useListEventRanking,
  useMembersControllerGetMe,
  useShowEventOverview,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Timer, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getMapStatus } from "./components/maps/map-status";
import { useEventPresence } from "./hooks/socket/use-event-presence";
import {
  isWindowActive,
  useWindowStatus,
  type WindowStatus,
} from "./hooks/use-window-status";
import { canManageEvent } from "./utils/event-access";
import { findEventHeroTimer } from "./utils/find-event-hero-timer";
import { getAssignmentAvailability } from "./utils/get-assignment-availability";

import { invalidateKillQueries } from "./hooks/mutations/invalidate-kill-queries";
import { invalidateMapQueries } from "./hooks/mutations/invalidate-map-queries";
import { invalidateRespawnQueries } from "./hooks/mutations/invalidate-respawn-queries";

import type { EventMapsResponse } from "./types/api";

const getEventHero = (
  event: EventOverview | undefined,
  eventMaps: EventMapsResponse | undefined,
  heroId: string | undefined,
) => {
  const heroBase = event?.heroNpcs?.find((hero) => hero.id === heroId);

  if (!heroBase) return undefined;
  const heroMapsData = eventMaps?.heroNpcs?.find((hero) => hero.id === heroId);

  return {
    ...heroBase,
    locations: heroMapsData?.locations ?? [],
    maps: heroMapsData?.maps ?? [],
  };
};

const getHeroMapsView = (
  hero: NonNullable<ReturnType<typeof getEventHero>>,
  windowStatus: WindowStatus,
  presenceData: Parameters<typeof getMapStatus>[1] | undefined,
) => {
  const allMaps = [
    ...hero.locations.flatMap((location) => location.maps),
    ...hero.maps,
  ];

  const canShowCoverageCount =
    isWindowActive(windowStatus) && presenceData !== undefined;

  const coveredMapsCount = canShowCoverageCount
    ? allMaps.filter(
        (map) => getMapStatus(map, presenceData) === "ASSIGNED_PRESENT",
      ).length
    : 0;

  const assignedMembers = allMaps.flatMap((map) => map.assignedMembers);

  return {
    allMaps,
    totalMapsCount: allMaps.length,
    canShowCoverageCount,
    coveredMapsCount,
    uniqueMembers: Array.from(
      new Map(assignedMembers.map((member) => [member.id, member])).values(),
    ),
  };
};

const getRespawnActionView = (
  hasTimer: boolean,
  t: ReturnType<typeof useTranslation>["t"],
) => ({
  label: t(
    hasTimer ? "events.respawn.closeWindow" : "events.respawn.openWindow",
  ),
  Icon: hasTimer ? X : Timer,
});

const getHeroRouteAvailability = (
  guildId: string | undefined,
  eventId: string | undefined,
  heroId: string | undefined,
) => ({
  hasGuildId: Boolean(guildId),
  hasEventRouteParams: Boolean(guildId && eventId),
  hasHeroRouteParams: Boolean(guildId && eventId && heroId),
});

const canLoadHeroTimers = (
  hasEventRouteParams: boolean,
  world: string | null | undefined,
) => hasEventRouteParams && Boolean(world);

const isHeroDetailLoading = (isLoading: boolean, isMapsLoading: boolean) =>
  isLoading || isMapsLoading;

const isHeroDetailMissing = (
  error: Error | null,
  event: EventOverview | undefined,
  hero: ReturnType<typeof getEventHero>,
) => Boolean(error || !event || !hero);

function assertDefined<Value>(
  value: Value,
): asserts value is NonNullable<Value> {
  if (value === null || value === undefined) {
    throw new Error("Expected hero detail data to be available");
  }
}

const getAssignmentDisabledMessage = (
  reason: ReturnType<typeof getAssignmentAvailability>["reason"],
  t: ReturnType<typeof useTranslation>["t"],
) => (reason === "OVERDUE" ? t("events.maps.assignmentDisabledOverdue") : null);

const getHeroDetailRouteQuery = (
  guildId: string | undefined,
  eventId: string | undefined,
  heroId: string | undefined,
) => ({
  guildId: guildId ?? "",
  eventId: eventId ?? "",
  heroId: heroId ?? "",
});

const getHeroTimerQuery = (world: string | null | undefined) => ({
  world: world ?? "",
});

const getHeroTimerWindow = (timer: ReturnType<typeof findEventHeroTimer>) =>
  [timer?.minSpawnTime ?? null, timer?.maxSpawnTime ?? null] as const;

const getHeroAssignmentAvailability = (
  event: EventOverview | undefined,
  timer: ReturnType<typeof findEventHeroTimer>,
) =>
  getAssignmentAvailability({
    assignmentTimeoutMinutes: event?.assignmentTimeoutMinutes ?? 5,
    timer,
  });

export const useHeroDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId } = useParams({ strict: false });

  const {
    guildId: queryGuildId,
    eventId: queryEventId,
    heroId: queryHeroId,
  } = getHeroDetailRouteQuery(guildId, eventId, heroId);

  const queryClient = useQueryClient();

  const { hasGuildId, hasEventRouteParams, hasHeroRouteParams } =
    getHeroRouteAvailability(guildId, eventId, heroId);

  const { data: guild } = useGuildsControllerGetGuildById(
    {
      guildId: queryGuildId,
    },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getGuildsControllerGetGuildByIdQueryKey({
          guildId: queryGuildId,
        }),
      },
    },
  );

  const [isClearingAssignments, setIsClearingAssignments] = useState(false);
  const [pendingAssignmentCount, setPendingAssignmentCount] = useState(0);
  const [mapManageOpen, setMapManageOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [closeWindowOpen, setCloseWindowOpen] = useState(false);
  const [openWindowOpen, setOpenWindowOpen] = useState(false);

  const { data: accessPolicy } = useGuildPermissions();

  const { data: currentMember } = useMembersControllerGetMe(
    { guildId: queryGuildId },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getMembersControllerGetMeQueryKey({
          guildId: queryGuildId,
        }),
        staleTime: 30_000,
      },
    },
  );

  const assignMember = useEventsAssignmentControllerAssignMember({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateMapQueries(
          queryClient,
          variables.pathParams.guildId,
          variables.pathParams.eventId,
          variables.pathParams.mapId,
        );
      },
    },
  });

  const unassignMember = useEventsAssignmentControllerUnassignMember({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateMapQueries(
          queryClient,
          variables.pathParams.guildId,
          variables.pathParams.eventId,
          variables.pathParams.mapId,
        );
      },
    },
  });

  const selfAssignMember = useEventsAssignmentControllerSelfAssignMember({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateMapQueries(
          queryClient,
          variables.pathParams.guildId,
          variables.pathParams.eventId,
          variables.pathParams.mapId,
        );
      },
    },
  });

  const selfUnassignMember = useEventsAssignmentControllerSelfUnassignMember({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateMapQueries(
          queryClient,
          variables.pathParams.guildId,
          variables.pathParams.eventId,
          variables.pathParams.mapId,
        );
      },
    },
  });

  const closeRespawnWindow = useEventsMonitoringControllerCloseRespawnWindow({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateRespawnQueries(
          queryClient,
          variables.pathParams.guildId,
          variables.pathParams.eventId,
          variables.pathParams.heroId,
        );
        invalidateKillQueries(
          queryClient,
          variables.pathParams.guildId,
          variables.pathParams.eventId,
        );
      },
    },
  });

  const openRespawnWindow = useEventsMonitoringControllerOpenRespawnWindow({
    mutation: {
      onSuccess: (_data, variables) => {
        invalidateRespawnQueries(
          queryClient,
          variables.pathParams.guildId,
          variables.pathParams.eventId,
          variables.pathParams.heroId,
        );
      },
    },
  });

  const canManage = canManageEvent(accessPolicy);

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

  const { presenceData } = useEventPresence({
    guildId: guild?.id,
    world: event?.world,
  });

  const { data: activeGaps = [] } =
    useEventsMonitoringControllerGetActiveGapsForHero(
      {
        guildId: queryGuildId,
        eventId: queryEventId,
        heroId: queryHeroId,
      },
      {
        query: {
          enabled: hasHeroRouteParams,
          queryKey: getEventsMonitoringControllerGetActiveGapsForHeroQueryKey({
            guildId: queryGuildId,
            eventId: queryEventId,
            heroId: queryHeroId,
          }),
        },
      },
    );

  const { data: rankings = [] } = useListEventRanking(
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

  const { data: eventMaps, isLoading: isMapsLoading } = useListEventMaps(
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

  const { data: timers } = useListEventHeroTimers(
    {
      guildId: queryGuildId,
      eventId: queryEventId,
    },
    getHeroTimerQuery(event?.world),
    {
      query: {
        enabled: canLoadHeroTimers(hasEventRouteParams, event?.world),
        queryKey: getListEventHeroTimersQueryKey(
          {
            guildId: queryGuildId,
            eventId: queryEventId,
          },
          getHeroTimerQuery(event?.world),
        ),
      },
    },
  );

  const activeGapsMap = new Map(activeGaps.map((gap) => [gap.mapId, gap]));

  const hero = getEventHero(event, eventMaps, heroId);

  const heroTimer = findEventHeroTimer(timers, {
    heroNpcId: hero?.npcId,
    heroName: hero?.npcName,
  });

  const heroTimerWindow = getHeroTimerWindow(heroTimer);
  const windowStatus = useWindowStatus(...heroTimerWindow);

  if (isHeroDetailLoading(isLoading, isMapsLoading))
    return { status: "loading" as const };

  const {
    allowed: assignmentAllowed,
    enabledAt: assignmentEnabledAt,
    reason: assignmentDisabledReason,
  } = getHeroAssignmentAvailability(event, heroTimer);

  const assignmentDisabledMessage = getAssignmentDisabledMessage(
    assignmentDisabledReason,
    t,
  );

  if (isHeroDetailMissing(error, event, hero))
    return { status: "missing" as const, t, queryGuildId, queryEventId };

  assertDefined(event);
  assertDefined(hero);

  const {
    allMaps,
    totalMapsCount,
    canShowCoverageCount,
    coveredMapsCount,
    uniqueMembers,
  } = getHeroMapsView(hero, windowStatus, presenceData);

  const respawnAction = getRespawnActionView(Boolean(heroTimer), t);
  const RespawnActionIcon = respawnAction.Icon;

  const handleRespawnActionClick = () => {
    if (heroTimer) {
      setCloseWindowOpen(true);

      return;
    }

    setOpenWindowOpen(true);
  };

  const handleSelfAssignClick = async (mapId: string) => {
    if (!eventId) return;

    setPendingAssignmentCount((count) => count + 1);

    try {
      if (!assignmentAllowed) {
        const assignmentErrorCandidate = assignmentDisabledMessage;
        const assignmentErrorFallback = t("events.maps.assignError");
        toast.error(assignmentErrorCandidate ?? assignmentErrorFallback);

        return;
      }

      await selfAssignMember.mutateAsync({
        pathParams: {
          guildId: queryGuildId,
          eventId,
          mapId,
        },
      });
      toast.success(t("events.maps.assignSuccess"));
    } catch {
      toast.error(t("events.maps.assignError"));
    } finally {
      setPendingAssignmentCount((count) => count - 1);
    }
  };

  const handleSelfUnassignClick = async (mapId: string) => {
    if (!eventId) return;

    setPendingAssignmentCount((count) => count + 1);

    try {
      await selfUnassignMember.mutateAsync({
        pathParams: {
          guildId: queryGuildId,
          eventId,
          mapId,
        },
      });
      toast.success(t("events.maps.unassignSuccess"));
    } catch {
      toast.error(t("events.maps.unassignError"));
    } finally {
      setPendingAssignmentCount((count) => count - 1);
    }
  };

  const handleManageClick = (mapId: string) => {
    setSelectedMapId(mapId);
    setAssignmentOpen(true);
  };

  const handleAssignFromModal = async (memberId: number) => {
    if (!selectedMapId || !guildId || !eventId) return;

    setPendingAssignmentCount((count) => count + 1);

    try {
      if (!assignmentAllowed) {
        const assignmentErrorCandidate = assignmentDisabledMessage;
        const assignmentErrorFallback = t("events.maps.assignError");
        toast.error(assignmentErrorCandidate ?? assignmentErrorFallback);

        return;
      }

      await assignMember.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          mapId: selectedMapId,
        },
        data: {
          memberId,
        },
      });
      toast.success(t("events.maps.assignSuccess"));
    } catch {
      toast.error(t("events.maps.assignError"));
    } finally {
      setPendingAssignmentCount((count) => count - 1);
    }
  };

  const handleUnassignFromModal = async (memberId: number) => {
    if (!selectedMapId || !guildId || !eventId) return;

    setPendingAssignmentCount((count) => count + 1);

    try {
      await unassignMember.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          mapId: selectedMapId,
        },
        params: {
          memberId: String(memberId),
        },
      });
      toast.success(t("events.maps.unassignSuccess"));
    } catch {
      toast.error(t("events.maps.unassignError"));
    } finally {
      setPendingAssignmentCount((count) => count - 1);
    }
  };

  const selectedMap = allMaps.find((m) => m.id === selectedMapId);

  const handleClearAllAssignments = async () => {
    if (!eventId || allMaps.length === 0 || isClearingAssignments) return;
    setIsClearingAssignments(true);

    try {
      const results = await Promise.allSettled(
        allMaps.map((map) =>
          unassignMember.mutateAsync({
            pathParams: {
              guildId: queryGuildId,
              eventId,
              mapId: map.id,
            },
          }),
        ),
      );

      if (results.some((result) => result.status === "rejected")) {
        toast.error(t("events.maps.clearAllError"));
      } else {
        toast.success(t("events.maps.clearAllSuccess"));
      }
    } catch {
      toast.error(t("events.maps.clearAllError"));
    } finally {
      setIsClearingAssignments(false);
    }
  };

  const handleCloseRespawnWindow = async (options: {
    createNewWindow: boolean;
    newMinSpawnTime?: string;
    newMaxSpawnTime?: string;
  }) => {
    if (!eventId || !heroId) return;

    try {
      await closeRespawnWindow.mutateAsync({
        pathParams: {
          guildId: queryGuildId,
          eventId,
          heroId,
        },
        data: {
          ...options,
        },
      });
      toast.success(t("events.respawn.closeSuccess"));
      setCloseWindowOpen(false);
    } catch (error) {
      toast.error(t("events.respawn.closeError"));
      throw error;
    }
  };

  const handleOpenRespawnWindow = async (options: {
    minSpawnTime: string;
    maxSpawnTime: string;
  }) => {
    if (!eventId || !heroId) return;

    try {
      await openRespawnWindow.mutateAsync({
        pathParams: {
          guildId: queryGuildId,
          eventId,
          heroId,
        },
        data: {
          minSpawnTime: options.minSpawnTime,
          maxSpawnTime: options.maxSpawnTime,
        },
      });
      toast.success(t("events.respawn.openSuccess"));
      setOpenWindowOpen(false);
    } catch (error) {
      toast.error(t("events.respawn.openError"));
      throw error;
    }
  };

  return {
    status: "ready" as const,
    hero,
    event,
    heroTimer,
    windowStatus,
    t,
    canManage,
    respawnAction,
    handleRespawnActionClick,
    RespawnActionIcon,
    guildId,
    eventId,
    canShowCoverageCount,
    coveredMapsCount,
    totalMapsCount,
    handleClearAllAssignments,
    isClearingAssignments,
    uniqueMembers,
    pendingAssignmentCount,
    setMapManageOpen,
    handleSelfAssignClick,
    handleSelfUnassignClick,
    handleManageClick,
    currentMember,
    presenceData,
    assignmentAllowed,
    assignmentEnabledAt,
    assignmentDisabledMessage,
    activeGapsMap,
    queryGuildId,
    queryEventId,
    rankings,
    heroId,
    queryHeroId,
    mapManageOpen,
    selectedMap,
    assignmentOpen,
    setAssignmentOpen,
    handleAssignFromModal,
    handleUnassignFromModal,
    closeWindowOpen,
    setCloseWindowOpen,
    handleCloseRespawnWindow,
    isLoading,
    closeRespawnWindow,
    openWindowOpen,
    setOpenWindowOpen,
    handleOpenRespawnWindow,
    openRespawnWindow,
  };
};
