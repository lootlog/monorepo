import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEvent } from "./hooks/queries/use-event";
import { useEventHeroTimers } from "./hooks/queries/use-event-hero-timers";
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
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { Permission } from "@lootlog/types";
import { useState } from "react";
import { MapManageDialog } from "./components/dialogs/map-manage-dialog";
import { MemberAssignmentModal } from "./components/dialogs/member-assignment-modal";
import { CloseRespawnWindowDialog } from "./components/dialogs/close-respawn-window-dialog";
import { OpenRespawnWindowDialog } from "./components/dialogs/open-respawn-window-dialog";
import {
  useAssignMember,
  useUnassignMember,
  useSelfAssignMember,
  useSelfUnassignMember,
} from "./hooks/mutations/use-assign-member";
import { useWindowStatus, type WindowStatus } from "./hooks/use-window-status";
import {
  useCloseRespawnWindow,
  useOpenRespawnWindow,
} from "./hooks/mutations/use-respawn-window";
import { toast } from "sonner";
import { useGuildMember } from "@/hooks/api/members/use-guild-member";
import { useEventPresence } from "./hooks/socket/use-event-presence";
import { useEventSocket } from "./hooks/socket/use-event-socket";
import { useHeroActiveGaps } from "./hooks/queries/use-hero-active-gaps";
import { RecentKillsPreview } from "./components/kills/recent-kills-preview";
import { EventHeroLoots } from "./components/stats/event-hero-loots";
import { EventRankingPreview } from "./components/ranking/event-ranking-preview";
import { NpcTile } from "@/components/tiles";
import { HeroTimerCountdown } from "./components/heroes/hero-timer-countdown";
import { MemberBadge } from "./components/shared/member-badge";
import { getMapStatus } from "./components/maps/map-card";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import { useGuild } from "@/hooks/api/guilds/use-guild";

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
  const { data: guild } = useGuild();
  const [mapManageOpen, setMapManageOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [closeWindowOpen, setCloseWindowOpen] = useState(false);
  const [openWindowOpen, setOpenWindowOpen] = useState(false);

  const { data: permissions } = useGuildPermissions();
  const { data: currentMember } = useGuildMember();
  const assignMember = useAssignMember();
  const unassignMember = useUnassignMember();
  const selfAssignMember = useSelfAssignMember();
  const selfUnassignMember = useSelfUnassignMember();

  const closeRespawnWindow = useCloseRespawnWindow();
  const openRespawnWindow = useOpenRespawnWindow();

  const canManage =
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
    permissions?.includes(Permission.LOOTLOG_EVENTS_MANAGE) ||
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  const {
    data: event,
    isLoading,
    error,
  } = useEvent({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  const { presenceData } = useEventPresence({ guildId: guild?.id });

  useEventSocket({ eventId, guildId: guild?.id, heroId });

  const { activeGapsMap } = useHeroActiveGaps(eventId ?? "", heroId ?? "");

  const { data: timers } = useEventHeroTimers({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    world: event?.world ?? "",
  });

  const hero = event?.heroNpcs?.find((h) => h.id === heroId);
  const heroTimer = timers?.find(
    (t) => t.npcId === hero?.npcId || t.npc?.name === hero?.npcName,
  );

  const windowStatus = useWindowStatus(
    heroTimer?.minSpawnTime ?? null,
    heroTimer?.maxSpawnTime ?? null,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const getAssignmentStatus = () => {
    if (!hero) return { allowed: false, enabledAt: null };
    if (!heroTimer) return { allowed: false, enabledAt: null };

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
  const coveredMapsCount =
    windowStatus === "OPEN"
      ? allMaps.filter(
          (map) => getMapStatus(map, presenceData) === "ASSIGNED_PRESENT",
        ).length
      : 0;
  const allAssignedMembers = allMaps.flatMap((m) => m.assignedMembers);
  const uniqueMembers = Array.from(
    new Map(allAssignedMembers.map((m) => [m.id, m])).values(),
  );

  const handleSelfAssignClick = async (mapId: string) => {
    try {
      await selfAssignMember.mutateAsync({
        eventId: eventId!,
        mapId,
      });
      toast.success(t("events.maps.assignSuccess"));
    } catch {
      toast.error(t("events.maps.assignError"));
    }
  };

  const handleSelfUnassignClick = async (mapId: string) => {
    try {
      await selfUnassignMember.mutateAsync({
        eventId: eventId!,
        mapId,
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
      await assignMember.mutateAsync({
        eventId,
        mapId: selectedMapId,
        memberId,
      });
      toast.success(t("events.maps.assignSuccess"));
    } catch (error) {
      toast.error(t("events.maps.assignError"));
    }
  };

  const handleUnassignFromModal = async (memberId: number) => {
    if (!selectedMapId || !guildId || !eventId) return;

    try {
      await unassignMember.mutateAsync({
        eventId,
        mapId: selectedMapId,
        memberId,
      });
      toast.success(t("events.maps.unassignSuccess"));
    } catch (error) {
      toast.error(t("events.maps.unassignError"));
    }
  };

  const selectedMap = allMaps.find((m) => m.id === selectedMapId);

  const handleClearAllAssignments = async () => {
    if (allMaps.length === 0) return;

    try {
      await Promise.all(
        allMaps.map((map) =>
          unassignMember.mutateAsync({
            eventId: eventId!,
            mapId: map.id,
          }),
        ),
      );
      toast.success(t("events.maps.clearAllSuccess"));
    } catch (error) {
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
        eventId,
        heroId,
        ...options,
      });
      toast.success(t("events.respawn.closeSuccess"));
      setCloseWindowOpen(false);
    } catch (_error) {
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
        eventId,
        heroId,
        minSpawnTime: options.minSpawnTime,
        maxSpawnTime: options.maxSpawnTime,
      });
      toast.success(t("events.respawn.openSuccess"));
      setOpenWindowOpen(false);
    } catch (_error) {
      toast.error(t("events.respawn.openError"));
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {hero.npcIcon ? (
            <NpcTile
              npc={{
                id: hero.npcId ?? undefined,
                name: hero.npcName,
                icon: hero.npcIcon,
              }}
            />
          ) : (
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Swords className="size-4 text-yellow-500" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              {hero.npcName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
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
          <div className="flex items-center gap-2">
            {heroTimer ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCloseWindowOpen(true)}
              >
                <X className="w-4 h-4 mr-2" />
                {t("events.respawn.closeWindow")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenWindowOpen(true)}
              >
                <Timer className="w-4 h-4 mr-2" />
                {t("events.respawn.openWindow")}
              </Button>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {uniqueMembers.length > 0 && (
                <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
                  <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t("events.participants.title")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {uniqueMembers.map((member) => (
                      <MemberBadge key={member.id} member={member} />
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t("events.maps.title")}
                    <span className="font-normal">
                      {windowStatus === "OPEN" ? (
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
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAllAssignments}
                        disabled={uniqueMembers.length === 0}
                      >
                        <Eraser className="w-4 h-4 mr-2" />
                        {t("events.maps.clearAll")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
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
                  windowStatus={windowStatus}
                  activeGapsMap={activeGapsMap}
                  vertical
                />
              </Card>
            </div>

            <div className="space-y-4">
              <EventRankingPreview
                rankings={
                  event.rankings?.filter(
                    (r) => r.heroNpcName === hero.npcName,
                  ) ?? []
                }
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
