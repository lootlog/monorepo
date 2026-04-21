import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
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
import { MemberBadge } from "./components/shared/member-badge";
import { getMapStatus } from "./components/maps/map-card";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { Spinner } from "@lootlog/ui/components/spinner";
import { findEventHeroTimer } from "./utils/find-event-hero-timer";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  useGuildsControllerGetGuildById,
  useGuildsControllerGetGuildPermissions,
} from "@/lib/api/generated/main/guilds/guilds";
import {
  getMembersControllerGetMeQueryKey,
  useMembersControllerGetMe,
} from "@/lib/api/generated/main/members/members";
import {
  getListEventHeroTimersQueryKey,
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
} from "@/lib/api/generated/main/events/events";
import { invalidateKillQueries } from "./hooks/mutations/invalidate-kill-queries";
import { invalidateMapQueries } from "./hooks/mutations/invalidate-map-queries";
import { invalidateRespawnQueries } from "./hooks/mutations/invalidate-respawn-queries";

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

export const HeroDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId } = useParams({ strict: false });
  const queryClient = useQueryClient();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });
  const [mapManageOpen, setMapManageOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [closeWindowOpen, setCloseWindowOpen] = useState(false);
  const [openWindowOpen, setOpenWindowOpen] = useState(false);

  const { data: permissions } = useGuildsControllerGetGuildPermissions(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
          guildId: guildId ?? "",
        }),
        staleTime: 30_000,
      },
    },
  );
  const { data: currentMember } = useMembersControllerGetMe(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: getMembersControllerGetMeQueryKey({
          guildId: guildId ?? "",
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

  const canManage =
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
    permissions?.includes(Permission.LOOTLOG_EVENTS_MANAGE) ||
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  const {
    data: event,
    isLoading,
    error,
  } = useShowEventOverview({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  const { presenceData } = useEventPresence({
    guildId: guild?.id,
    world: event?.world,
  });

  const { data: activeGaps = [] } =
    useEventsMonitoringControllerGetActiveGapsForHero({
      guildId: guildId ?? "",
      eventId: eventId ?? "",
      heroId: heroId ?? "",
    });
  const { data: rankings = [] } = useListEventRanking({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });
  const { data: eventMaps, isLoading: isMapsLoading } = useListEventMaps({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  const { data: timers } = useListEventHeroTimers(
    {
      guildId: guildId ?? "",
      eventId: eventId ?? "",
    },
    {
      world: event?.world ?? "",
    },
    {
      query: {
        enabled: Boolean(event?.world),
        queryKey: getListEventHeroTimersQueryKey(
          {
            guildId: guildId ?? "",
            eventId: eventId ?? "",
          },
          {
            world: event?.world ?? "",
          },
        ),
      },
    },
  );

  const activeGapsMap = new Map(activeGaps.map((gap) => [gap.mapId, gap]));

  const heroBase = event?.heroNpcs?.find((h) => h.id === heroId);
  const heroMapsData = eventMaps?.heroNpcs?.find((h) => h.id === heroId);
  const hero = heroBase
    ? {
        ...heroBase,
        locations: heroMapsData?.locations ?? [],
        maps: heroMapsData?.maps ?? [],
      }
    : undefined;
  const heroTimer = findEventHeroTimer(timers, {
    heroNpcId: hero?.npcId,
    heroName: hero?.npcName,
  });

  const windowStatus = useWindowStatus(
    heroTimer?.minSpawnTime ?? null,
    heroTimer?.maxSpawnTime ?? null,
  );

  if (isLoading || isMapsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const getAssignmentStatus = () => {
    if (!hero) return { allowed: false, enabledAt: null };
    if (!heroTimer) return { allowed: false, enabledAt: null };

    if (windowStatus === "OVERDUE") {
      return { allowed: false, enabledAt: null };
    }

    const minSpawn = new Date(heroTimer.minSpawnTime);
    const now = new Date();
    const timeoutMinutes = event?.assignmentTimeoutMinutes ?? 5;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const allowed = minSpawn.getTime() - now.getTime() <= timeoutMs;
    const enabledAt = allowed ? null : new Date(minSpawn.getTime() - timeoutMs);

    return { allowed, enabledAt };
  };

  const { allowed: assignmentAllowed, enabledAt: assignmentEnabledAt } =
    getAssignmentStatus();
  const assignmentDisabledMessage =
    windowStatus === "OVERDUE"
      ? t("events.maps.assignmentDisabledOverdue")
      : null;

  if (error || !event || !hero) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{t("events.heroes.notFound")}</p>
        <Link
          to="/$guildId/events/$eventId"
          params={{ guildId: guildId ?? "", eventId: eventId ?? "" }}
        >
          <Button variant="outline">{t("events.common.backToEvent")}</Button>
        </Link>
      </div>
    );
  }

  const allMapsFromLocations = hero.locations?.flatMap((loc) => loc.maps) ?? [];
  const allMaps = [...allMapsFromLocations, ...(hero.maps ?? [])];

  const totalMapsCount = allMaps.length;
  const coveredMapsCount = isWindowActive(windowStatus)
    ? allMaps.filter(
        (map) => getMapStatus(map, presenceData) === "ASSIGNED_PRESENT",
      ).length
    : 0;
  const allAssignedMembers = allMaps.flatMap((m) => m.assignedMembers);
  const uniqueMembers = Array.from(
    new Map(allAssignedMembers.map((m) => [m.id, m])).values(),
  );

  const handleSelfAssignClick = async (mapId: string) => {
    if (!eventId) return;

    try {
      if (!assignmentAllowed) {
        toast.error(assignmentDisabledMessage ?? t("events.maps.assignError"));
        return;
      }
      await selfAssignMember.mutateAsync({
        pathParams: {
          guildId: guildId ?? "",
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
          guildId: guildId ?? "",
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
        toast.error(assignmentDisabledMessage ?? t("events.maps.assignError"));
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
              guildId: guildId ?? "",
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
          guildId: guildId ?? "",
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
          guildId: guildId ?? "",
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

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {hero.npcIcon ? (
                  <NpcTile
                    npc={{
                      id: hero.npcId ?? undefined,
                      name: hero.npcName,
                      icon: hero.npcIcon,
                    }}
                  />
                ) : (
                  <div className="rounded-xl bg-yellow-500/10 p-2 shadow-inner shadow-yellow-500/10">
                    <Swords className="size-4 text-yellow-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {event.name}
                  </p>
                  <h2 className="text-base font-semibold leading-tight break-words">
                    {hero.npcName} {hero.npcLvl ? `(${hero.npcLvl})` : ""}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <HeroTimerCountdown timer={heroTimer} />
                    {windowStatus !== "NONE" && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          getWindowStatusConfig(windowStatus, t).className,
                        )}
                      >
                        {getWindowStatusConfig(windowStatus, t).label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                  {heroTimer ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center sm:w-auto"
                      onClick={() => setCloseWindowOpen(true)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("events.respawn.closeWindow")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center sm:w-auto"
                      onClick={() => setOpenWindowOpen(true)}
                    >
                      <Timer className="w-4 h-4 mr-2" />
                      {t("events.respawn.openWindow")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {uniqueMembers.length > 0 && (
                <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
                  <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t("events.participants.title")}{" "}
                    <span className="text-muted-foreground">
                      ({uniqueMembers.length})
                    </span>
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {uniqueMembers.map((member) => (
                      <MemberBadge key={member.id} member={member} />
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t("events.maps.title")}
                    <span className="font-normal">
                      {isWindowActive(windowStatus) ? (
                        <span
                          className={cn(
                            coveredMapsCount === totalMapsCount
                              ? "text-green-500"
                              : coveredMapsCount > 0
                                ? "text-yellow-500"
                                : "text-destructive",
                          )}
                        >
                          ({coveredMapsCount}/{totalMapsCount})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          ({totalMapsCount})
                        </span>
                      )}
                    </span>
                  </h2>
                  {canManage && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center sm:w-auto"
                        onClick={handleClearAllAssignments}
                        disabled={uniqueMembers.length === 0}
                      >
                        <Eraser className="w-4 h-4 mr-2" />
                        {t("events.maps.clearAll")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center sm:w-auto"
                        onClick={() => setMapManageOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("events.maps.manage")}
                      </Button>
                    </div>
                  )}
                </div>
                <EventMapGrid
                  locations={hero.locations ?? []}
                  maps={hero.maps ?? []}
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
            </div>

            <div className="space-y-4">
              <EventRankingPreview
                rankings={rankings.filter(
                  (r) => r.heroNpcName === hero.npcName,
                )}
                heroNpcs={[hero]}
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
                limit={5}
              />

              <RecentKillsPreview
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
                heroId={heroId ?? ""}
                limit={5}
                showHeroName
              />

              <EventHeroLoots
                guildId={guildId ?? ""}
                heroNpcNames={[hero.npcName]}
                world={event.world}
                limit={3}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
      <MapManageDialog
        open={mapManageOpen}
        onOpenChange={setMapManageOpen}
        guildId={guildId ?? ""}
        eventId={eventId ?? ""}
        hero={hero}
      />
      {selectedMap && (
        <MemberAssignmentModal
          open={assignmentOpen}
          onOpenChange={setAssignmentOpen}
          mapName={selectedMap.mapName}
          assignedMembers={selectedMap.assignedMembers || []}
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
