import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { EventMapGrid } from "./components/maps/event-map-grid";
import {
  Swords,
  MapPin,
  Users,
  AlertCircle,
  Plus,
  Eraser,
  X,
  Timer,
} from "lucide-react";
import { Permission } from "@lootlog/types";
import { useState } from "react";
import { MapManageDialog } from "./components/dialogs/map-manage-dialog";
import { MemberAssignmentModal } from "./components/dialogs/member-assignment-modal";
import { CloseRespawnWindowDialog } from "./components/dialogs/close-respawn-window-dialog";
import { OpenRespawnWindowDialog } from "./components/dialogs/open-respawn-window-dialog";
import {
  useWindowStatus,
  isWindowActive,
  type WindowStatus,
} from "./hooks/use-window-status";
import { toast } from "sonner";
import { useEventPresence } from "./hooks/socket/use-event-presence";
import { RecentKillsPreview } from "./components/kills/recent-kills-preview";
import { EventHeroLoots } from "./components/stats/event-hero-loots";
import { EventRankingPreview } from "./components/ranking/event-ranking-preview";
import { NpcTile } from "@/components/tiles";
import { HeroTimerCountdown } from "./components/heroes/hero-timer-countdown";
import { HeroDetailResponsiveLayout } from "./components/heroes/hero-detail-responsive-layout";
import { MemberBadge } from "./components/shared/member-badge";
import { getMapStatus } from "./components/maps/map-card";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { Spinner } from "@lootlog/ui/components/spinner";
import { findEventHeroTimer } from "./utils/find-event-hero-timer";
import { getAssignmentAvailability } from "./utils/get-assignment-availability";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  useGuildsControllerGetGuildById,
} from "@lootlog/api-client/react-query/main/guilds";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  getMembersControllerGetMeQueryKey,
  useMembersControllerGetMe,
} from "@lootlog/api-client/react-query/main/members";
import {
  getEventsMonitoringControllerGetActiveGapsForHeroQueryKey,
  getListEventHeroTimersQueryKey,
  getListEventMapsQueryKey,
  getListEventRankingQueryKey,
  getShowEventOverviewQueryKey,
  useEventsAssignmentControllerAssignMember,
  useEventsAssignmentControllerSelfAssignMember,
  useEventsAssignmentControllerSelfUnassignMember,
  useEventsAssignmentControllerUnassignMember,
  useEventsMonitoringControllerGetActiveGapsForHero,
  useEventsMonitoringControllerCloseRespawnWindow,
  useEventsMonitoringControllerOpenRespawnWindow,
  useListEventHeroTimers,
  useListEventMaps,
  useListEventRanking,
  useShowEventOverview,
} from "@lootlog/api-client/react-query/main/events";
import { invalidateKillQueries } from "./hooks/mutations/invalidate-kill-queries";
import { invalidateMapQueries } from "./hooks/mutations/invalidate-map-queries";
import { invalidateRespawnQueries } from "./hooks/mutations/invalidate-respawn-queries";
import type { EventOverviewResponseDto } from "@lootlog/api-client/models/main/event-overview-response-dto";
import type { EventMapsResponse } from "./types/api";

const getWindowStatusConfig = (
  status: WindowStatus,
  t: (key: string) => string,
) => {
  switch (status) {
    case "OPEN":
      return {
        label: t("events.respawn.status.open"),
        className: "bg-green-500/10 text-green-500 border-green-500/20",
      };
    case "WAITING":
      return {
        label: t("events.respawn.status.waiting"),
        className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      };
    case "OVERDUE":
      return {
        label: t("events.respawn.status.overdue"),
        className: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      };
    case "NONE":
    default:
      return {
        label: t("events.respawn.status.none"),
        className: "bg-muted text-muted-foreground border-border",
      };
  }
};

const getMapCoverageCountClassName = (
  canShowCoverageCount: boolean,
  coveredMapsCount: number,
  totalMapsCount: number,
) => {
  if (!canShowCoverageCount) return "text-muted-foreground";
  if (coveredMapsCount === totalMapsCount) return "text-green-500";
  if (coveredMapsCount > 0) return "text-yellow-500";
  return "text-destructive";
};

type EventOverview = EventOverviewResponseDto;

const canManageEvent = (
  permissions: ReturnType<typeof useGuildPermissions>["data"],
) =>
  Boolean(
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
    permissions?.includes(Permission.LOOTLOG_EVENTS_MANAGE) ||
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER),
  );

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

const getMapCoverageLabel = (
  canShowCoverageCount: boolean,
  coveredMapsCount: number,
  totalMapsCount: number,
) =>
  canShowCoverageCount
    ? `(${coveredMapsCount}/${totalMapsCount})`
    : `(${totalMapsCount})`;

const isHeroDetailLoading = (isLoading: boolean, isMapsLoading: boolean) =>
  isLoading || isMapsLoading;

const isHeroDetailMissing = (
  error: unknown,
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

export const HeroDetail = () => {
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
  const [mapManageOpen, setMapManageOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [closeWindowOpen, setCloseWindowOpen] = useState(false);
  const [openWindowOpen, setOpenWindowOpen] = useState(false);

  const { data: permissions } = useGuildPermissions();
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

  const canManage = canManageEvent(permissions);

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

  if (isHeroDetailLoading(isLoading, isMapsLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const {
    allowed: assignmentAllowed,
    enabledAt: assignmentEnabledAt,
    reason: assignmentDisabledReason,
  } = getHeroAssignmentAvailability(event, heroTimer);
  const assignmentDisabledMessage = getAssignmentDisabledMessage(
    assignmentDisabledReason,
    t,
  );

  if (isHeroDetailMissing(error, event, hero)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{t("events.heroes.notFound")}</p>
        <Link
          to="/$guildId/events/$eventId"
          params={{ guildId: queryGuildId, eventId: queryEventId }}
        >
          <Button variant="outline">{t("events.common.backToEvent")}</Button>
        </Link>
      </div>
    );
  }

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
    }
  };

  const handleSelfUnassignClick = async (mapId: string) => {
    if (!eventId) return;

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
    }
  };

  const handleManageClick = (mapId: string) => {
    setSelectedMapId(mapId);
    setAssignmentOpen(true);
  };

  const handleAssignFromModal = async (memberId: number) => {
    if (!selectedMapId || !guildId || !eventId) return;

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
    }
  };

  const handleUnassignFromModal = async (memberId: number) => {
    if (!selectedMapId || !guildId || !eventId) return;

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
    }
  };

  const selectedMap = allMaps.find((m) => m.id === selectedMapId);

  const handleClearAllAssignments = async () => {
    if (!eventId || allMaps.length === 0) return;

    try {
      await Promise.all(
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
      toast.success(t("events.maps.clearAllSuccess"));
    } catch {
      toast.error(t("events.maps.clearAllError"));
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
    } catch {
      toast.error(t("events.respawn.closeError"));
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
    } catch {
      toast.error(t("events.respawn.openError"));
    }
  };

  const renderHeroHeader = () => (
    <Card className="gap-0 overflow-hidden border-border bg-card p-0">
      <div className="flex min-w-0 items-center gap-3 p-3 md:px-4">
        {hero.npcIcon ? (
          <NpcTile
            className="flex w-10 shrink-0 items-center justify-center"
            npc={{
              id: hero.npcId ?? undefined,
              name: hero.npcName,
              icon: hero.npcIcon,
            }}
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 ring-1 ring-border/70">
            <Swords className="size-4 text-yellow-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium leading-none text-muted-foreground">
            {event.name}
          </p>
          <h1 className="mt-1 truncate text-base font-semibold leading-none">
            {hero.npcName} {hero.npcLvl ? `(${hero.npcLvl})` : ""}
          </h1>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs leading-none text-muted-foreground">
            <HeroTimerCountdown timer={heroTimer} />
            {windowStatus !== "NONE" && (
              <>
                <span aria-hidden="true">·</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 shrink-0 px-1.5 text-[11px]",
                    getWindowStatusConfig(windowStatus, t).className,
                  )}
                >
                  {getWindowStatusConfig(windowStatus, t).label}
                </Badge>
              </>
            )}
          </div>
        </div>
        {canManage && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 px-2.5 lg:px-3"
                  aria-label={respawnAction.label}
                  onClick={handleRespawnActionClick}
                >
                  <RespawnActionIcon className="size-4" />
                  <span className="hidden lg:inline">
                    {respawnAction.label}
                  </span>
                </Button>
              }
            />
            <TooltipContent>{respawnAction.label}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-3">
          {renderHeroHeader()}

          <HeroDetailResponsiveLayout
            maps={
              <Card className="@container/maps gap-0 overflow-hidden border-border bg-card p-0">
                <header className="flex min-h-12 min-w-0 items-center gap-2 border-b border-border/70 px-3 py-2">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{t("events.maps.title")}</span>
                    <span
                      className={cn(
                        "shrink-0 font-normal",
                        getMapCoverageCountClassName(
                          canShowCoverageCount,
                          coveredMapsCount,
                          totalMapsCount,
                        ),
                      )}
                    >
                      {getMapCoverageLabel(
                        canShowCoverageCount,
                        coveredMapsCount,
                        totalMapsCount,
                      )}
                    </span>
                  </h2>
                  {canManage && (
                    <div className="ml-auto flex shrink-0 items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="inline-flex">
                              <Button
                                variant="outline"
                                size="sm"
                                className="size-9 px-0 @2xl/maps:w-auto @2xl/maps:px-3"
                                onClick={handleClearAllAssignments}
                                disabled={uniqueMembers.length === 0}
                                aria-label={t("events.maps.clearAll")}
                              >
                                <Eraser className="size-4" />
                                <span className="hidden @2xl/maps:inline">
                                  {t("events.maps.clearAll")}
                                </span>
                              </Button>
                            </span>
                          }
                        />
                        <TooltipContent>
                          {t("events.maps.clearAll")}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              className="size-9 px-0 @2xl/maps:w-auto @2xl/maps:px-3"
                              onClick={() => setMapManageOpen(true)}
                              aria-label={t("events.maps.manage")}
                            >
                              <Plus className="size-4" />
                              <span className="hidden @2xl/maps:inline">
                                {t("events.maps.manage")}
                              </span>
                            </Button>
                          }
                        />
                        <TooltipContent>
                          {t("events.maps.manage")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </header>
                <EventMapGrid
                  locations={hero.locations}
                  maps={hero.maps}
                  onSelfAssignClick={handleSelfAssignClick}
                  onSelfUnassignClick={handleSelfUnassignClick}
                  onManageClick={handleManageClick}
                  currentMemberId={currentMember?.id}
                  presenceData={presenceData}
                  assignmentDisabled={!assignmentAllowed}
                  assignmentEnabledAt={assignmentEnabledAt}
                  assignmentDisabledMessage={assignmentDisabledMessage}
                  windowStatus={windowStatus}
                  activeGapsMap={activeGapsMap}
                  vertical
                />
              </Card>
            }
            participants={
              uniqueMembers.length > 0 ? (
                <Card className="@container/participants gap-0 overflow-hidden border-border bg-card p-0">
                  <header className="flex min-h-12 items-center gap-2 border-b border-border/70 px-3 py-2">
                    <Users className="size-4 shrink-0 text-primary" />
                    <h2 className="truncate text-sm font-semibold">
                      {t("events.participants.title")}
                    </h2>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      ({uniqueMembers.length})
                    </span>
                  </header>
                  <div className="-mb-px -mr-px grid grid-cols-1 bg-card @sm/participants:grid-cols-2 @lg/participants:grid-cols-3 @2xl/participants:grid-cols-4">
                    {uniqueMembers.map((member) => (
                      <MemberBadge
                        key={member.id}
                        member={member}
                        guildId={queryGuildId}
                        eventId={queryEventId}
                      />
                    ))}
                  </div>
                </Card>
              ) : null
            }
            sidebar={
              <>
                <EventRankingPreview
                  rankings={rankings.filter(
                    (r) => r.heroNpcName === hero.npcName,
                  )}
                  heroNpcs={[hero]}
                  guildId={queryGuildId}
                  eventId={queryEventId}
                  limit={5}
                />

                <RecentKillsPreview
                  guildId={queryGuildId}
                  eventId={queryEventId}
                  heroId={queryHeroId}
                  limit={5}
                />

                <EventHeroLoots
                  guildId={queryGuildId}
                  heroNpcNames={[hero.npcName]}
                  world={event.world}
                  limit={3}
                />
              </>
            }
          />
        </div>
      </ScrollArea>
      <MapManageDialog
        open={mapManageOpen}
        onOpenChange={setMapManageOpen}
        guildId={queryGuildId}
        eventId={queryEventId}
        hero={hero}
      />
      {selectedMap && (
        <MemberAssignmentModal
          open={assignmentOpen}
          onOpenChange={setAssignmentOpen}
          mapName={selectedMap.mapName}
          assignedMembers={selectedMap.assignedMembers ?? []}
          onAssign={handleAssignFromModal}
          onUnassign={handleUnassignFromModal}
          disabled={!assignmentAllowed}
          disabledMessage={assignmentDisabledMessage}
        />
      )}
      <CloseRespawnWindowDialog
        open={closeWindowOpen}
        onOpenChange={setCloseWindowOpen}
        heroName={hero.npcName}
        onConfirm={handleCloseRespawnWindow}
        isLoading={closeRespawnWindow.isPending}
      />
      <OpenRespawnWindowDialog
        open={openWindowOpen}
        onOpenChange={setOpenWindowOpen}
        heroName={hero.npcName}
        onConfirm={handleOpenRespawnWindow}
        isLoading={openRespawnWindow.isPending}
      />
    </div>
  );
};
