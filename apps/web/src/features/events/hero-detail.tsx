import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEvent } from "./hooks/queries/use-event";
import { useEventHeroTimers } from "./hooks/queries/use-event-hero-timers";
import { EventMapGrid } from "./components/event-map-grid";
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
import { MapManageDialog } from "./components/map-manage-dialog";
import { MemberAssignmentModal } from "./components/member-assignment-modal";
import { CloseRespawnWindowDialog } from "./components/close-respawn-window-dialog";
import { OpenRespawnWindowDialog } from "./components/open-respawn-window-dialog";
import { useAssignMember, useUnassignMember } from "./hooks/mutations/use-assign-member";
import {
  useHeroRespawnConfig,
  type WindowStatus,
} from "./hooks/queries/use-hero-respawn-config";
import {
  useCloseRespawnWindow,
  useOpenRespawnWindow,
} from "./hooks/mutations/use-respawn-window";
import { toast } from "sonner";
import { useGuildMember } from "@/hooks/api/members/use-guild-member";
import { useEventPresence } from "./hooks/socket/use-event-presence";
import { useEventSocket } from "./hooks/socket/use-event-socket";
import { RecentKillsPreview } from "./components/recent-kills-preview";
import { EventHeroLoots } from "./components/event-hero-loots";
import { NpcTile } from "@/components/tiles";
import { HeroTimerCountdown } from "./components/hero-timer-countdown";
import { MemberBadge } from "./components/member-badge";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";

const getWindowStatusConfig = (
  status: WindowStatus,
  t: (key: string, fallback: string) => string,
) => {
  switch (status) {
    case "OPEN":
      return {
        label: t("events.respawn.status.open", "Okno otwarte"),
        className: "bg-green-500/10 text-green-500 border-green-500/20",
      };
    case "WAITING":
      return {
        label: t("events.respawn.status.waiting", "Oczekiwanie"),
        className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      };
    case "NONE":
    default:
      return {
        label: t("events.respawn.status.none", "Brak okna"),
        className: "bg-muted text-muted-foreground border-border",
      };
  }
};

export const HeroDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId } = useParams({ strict: false });
  const [mapManageOpen, setMapManageOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [closeWindowOpen, setCloseWindowOpen] = useState(false);
  const [openWindowOpen, setOpenWindowOpen] = useState(false);

  const { data: permissions } = useGuildPermissions();
  const { data: currentMember } = useGuildMember();
  const assignMember = useAssignMember();
  const unassignMember = useUnassignMember();

  // Respawn window management
  const { data: respawnConfig } = useHeroRespawnConfig(
    eventId ?? "",
    heroId ?? "",
  );
  const closeRespawnWindow = useCloseRespawnWindow();
  const openRespawnWindow = useOpenRespawnWindow();

  const canManage =
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
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

  const { presenceData } = useEventPresence({ guildId });

  // Socket subscription for real-time updates
  useEventSocket({ eventId, guildId, heroId });

  const { data: timers } = useEventHeroTimers({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    world: event?.world ?? "",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hero = event?.heroNpcs?.find((h) => h.id === heroId);

  // Find timer for this hero (by npcId or npcName)
  const heroTimer = timers?.find(
    (t) => t.npcId === hero?.npcId || t.npc?.name === hero?.npcName,
  );

  // Check if assignment is allowed (configurable minutes before minSpawnTime)
  const getAssignmentStatus = () => {
    if (!hero) return { allowed: false, enabledAt: null };
    if (!heroTimer) return { allowed: true, enabledAt: null }; // No timer = allowed

    const minSpawn = new Date(heroTimer.minSpawnTime);
    const now = new Date();
    const timeoutMinutes = event?.assignmentTimeoutMinutes ?? 5;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const allowed = minSpawn.getTime() - now.getTime() <= timeoutMs;
    // When assignment will be enabled (minSpawn - timeout)
    const enabledAt = allowed ? null : new Date(minSpawn.getTime() - timeoutMs);

    return { allowed, enabledAt };
  };

  const { allowed: assignmentAllowed, enabledAt: assignmentEnabledAt } = getAssignmentStatus();

  if (error || !event || !hero) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.heroes.notFound", "Nie znaleziono herosa")}
        </p>
        <Link
          to="/$guildId/events/$eventId"
          params={{ guildId: guildId ?? "", eventId: eventId ?? "" }}
        >
          <Button variant="outline">
            {t("events.common.backToEvent", "Powrót do eventu")}
          </Button>
        </Link>
      </div>
    );
  }

  const allAssignedMembers = hero.maps?.flatMap((m) => m.assignedMembers) || [];
  const uniqueMembers = Array.from(
    new Map(allAssignedMembers.map((m) => [m.id, m])).values(),
  );

  const handleSelfAssignClick = async (mapId: string) => {
    if (!currentMember) return;
    try {
      await assignMember.mutateAsync({
        eventId: eventId!,
        mapId,
        memberId: currentMember.id,
      });
      toast.success(t("events.maps.assignSuccess", "Przypisano do mapy"));
    } catch {
      toast.error(t("events.maps.assignError", "Błąd podczas przypisywania"));
    }
  };

  const handleSelfUnassignClick = async (mapId: string) => {
    if (!currentMember) return;
    try {
      await unassignMember.mutateAsync({
        eventId: eventId!,
        mapId,
        memberId: currentMember.id,
      });
      toast.success(t("events.maps.unassignSuccess", "Odpisano z mapy"));
    } catch {
      toast.error(t("events.maps.unassignError", "Błąd podczas odpisywania"));
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
      toast.success(t("events.maps.assignSuccess", "Przypisano członka"));
    } catch (error) {
      toast.error(t("events.maps.assignError", "Błąd podczas przypisywania"));
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
      toast.success(t("events.maps.unassignSuccess", "Odpisano członka"));
    } catch (error) {
      toast.error(t("events.maps.unassignError", "Błąd podczas odpisywania"));
    }
  };

  const selectedMap = hero.maps?.find((m) => m.id === selectedMapId);

  const handleClearAllAssignments = async () => {
    if (!hero.maps || hero.maps.length === 0) return;

    try {
      // Clear assignments from all maps
      await Promise.all(
        hero.maps.map((map) =>
          unassignMember.mutateAsync({
            eventId: eventId!,
            mapId: map.id,
            // Not passing memberId clears all assignments
          }),
        ),
      );
      toast.success(
        t("events.maps.clearAllSuccess", "Wyczyszczono wszystkie przypisania"),
      );
    } catch (error) {
      toast.error(
        t("events.maps.clearAllError", "Błąd podczas czyszczenia przypisań"),
      );
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
      toast.success(
        t("events.respawn.closeSuccess", "Okno respawnu zostało zamknięte"),
      );
      setCloseWindowOpen(false);
    } catch (_error) {
      toast.error(
        t("events.respawn.closeError", "Błąd podczas zamykania okna respawnu"),
      );
    }
  };

  const handleOpenRespawnWindow = async (options: {
    minSpawnTime?: string;
    maxSpawnTime?: string;
  }) => {
    if (!eventId || !heroId) return;

    try {
      await openRespawnWindow.mutateAsync({
        eventId,
        heroId,
        ...options,
      });
      toast.success(
        t("events.respawn.openSuccess", "Okno respawnu zostało otwarte"),
      );
      setOpenWindowOpen(false);
    } catch (_error) {
      toast.error(
        t("events.respawn.openError", "Błąd podczas otwierania okna respawnu"),
      );
    }
  };

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="flex flex-col gap-3">
        {/* Header */}
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
              <p className="text-xs text-muted-foreground leading-tight">
                ID: {hero.npcId} • {event.name}
              </p>
            </div>
          </div>

          {/* Timer Countdown & Window Status */}
          <div className="mr-3 flex items-center gap-2">
            <HeroTimerCountdown timer={heroTimer} />
            {respawnConfig && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  getWindowStatusConfig(respawnConfig.windowStatus, t).className,
                )}
              >
                {getWindowStatusConfig(respawnConfig.windowStatus, t).label}
              </Badge>
            )}
          </div>

          {/* Respawn Window Actions */}
          {canManage && (
            <div className="flex items-center gap-2">
              {respawnConfig?.hasTimer ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCloseWindowOpen(true)}
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("events.respawn.closeWindow", "Zamknij okno")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenWindowOpen(true)}
                >
                  <Timer className="w-4 h-4 mr-2" />
                  {t("events.respawn.openWindow", "Otwórz okno")}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="px-3 py-3 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column - Maps */}
            <div className="lg:col-span-2 space-y-4">
              {/* Stats */}
              <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{hero.maps?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">{t("events.maps.title")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-green-500/10">
                      <Users className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{uniqueMembers.length}</p>
                      <p className="text-xs text-muted-foreground">{t("events.participants.title", "Uczestnicy")}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Participants */}
              {uniqueMembers.length > 0 && (
                <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
                  <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t("events.participants.title", "Uczestnicy")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {uniqueMembers.map((member) => (
                      <MemberBadge key={member.id} member={member} />
                    ))}
                  </div>
                </Card>
              )}

              {/* Maps */}
              <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t("events.maps.title")}
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
                        {t("events.maps.clearAll", "Wyczyść przypisania")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMapManageOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("events.maps.manage", "Zarządzaj mapami")}
                      </Button>
                    </div>
                  )}
                </div>
                <EventMapGrid
                  maps={hero.maps || []}
                  guildId={guildId ?? ""}
                  eventId={eventId ?? ""}
                  heroId={hero.id}
                  onSelfAssignClick={handleSelfAssignClick}
                  onSelfUnassignClick={handleSelfUnassignClick}
                  onManageClick={handleManageClick}
                  currentMemberId={currentMember?.id}
                  presenceData={presenceData}
                  assignmentDisabled={!assignmentAllowed}
                  assignmentEnabledAt={assignmentEnabledAt}
                  windowStatus={respawnConfig?.windowStatus ?? 'OPEN'}
                  vertical
                />
              </Card>
            </div>

            {/* Right column - Recent kills & loots */}
            <div className="space-y-4">
              {/* Recent Kills */}
              <RecentKillsPreview
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
                heroId={heroId ?? ""}
                limit={5}
                showHeroName
              />

              {/* Recent Loots */}
              <EventHeroLoots
                guildId={guildId ?? ""}
                heroNpcNames={[hero.npcName]}
                world={event.world}
                limit={10}
              />
            </div>
          </div>
        </div>

        {/* Dialogs */}
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
          />
        )}

        {/* Respawn Window Dialogs */}
        <CloseRespawnWindowDialog
          open={closeWindowOpen}
          onOpenChange={setCloseWindowOpen}
          heroName={hero.npcName}
          defaultRespBaseSeconds={respawnConfig?.defaultRespBaseSeconds ?? 3600}
          defaultRespRandomness={respawnConfig?.defaultRespRandomness ?? 10}
          onConfirm={handleCloseRespawnWindow}
          isLoading={closeRespawnWindow.isPending}
        />

        <OpenRespawnWindowDialog
          open={openWindowOpen}
          onOpenChange={setOpenWindowOpen}
          heroName={hero.npcName}
          defaultRespBaseSeconds={respawnConfig?.defaultRespBaseSeconds ?? 3600}
          defaultRespRandomness={respawnConfig?.defaultRespRandomness ?? 10}
          onConfirm={handleOpenRespawnWindow}
          isLoading={openRespawnWindow.isPending}
        />
      </div>
    </ScrollArea>
  );
};
