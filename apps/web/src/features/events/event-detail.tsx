import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Badge } from "@lootlog/ui/components/badge";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEvent } from "./hooks/use-event";
import { EventRankingPreview } from "./components/event-ranking-preview";
import {
  Trophy,
  MapPin,
  Users,
  AlertCircle,
  Swords,
  ChevronRight,
  Pencil,
  Plus,
  MoreVertical,
  Trash2,
  Map as MapIcon,
  Clock,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { EventEditDialog } from "./components/event-edit-dialog";
import { HeroManageDialog } from "./components/hero-manage-dialog";
import { MapManageDialog } from "./components/map-manage-dialog";
import { useEventMutations } from "./hooks/use-event-mutations";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import {
  useEventHeroTimers,
  type EventTimer,
} from "./hooks/use-event-hero-timers";
import { useEventHeroStats } from "./hooks/use-event-hero-stats";
import { EventHeroLoots } from "./components/event-hero-loots";
import { parseMsToTime } from "@/utils/date/parse-ms-to-time";
import { cn } from "@/utils/cn";

interface HeroTimerDisplayProps {
  timer: EventTimer | undefined;
  t: ReturnType<typeof useTranslation>["t"];
}

const HeroTimerDisplay = ({ timer, t }: HeroTimerDisplayProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!timer) {
      setTimeLeft(null);
      return;
    }

    const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();
    setTimeLeft(maxSpawnTime - Date.now());

    const interval = setInterval(() => {
      const time = maxSpawnTime - Date.now();
      if (time <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        return;
      }
      setTimeLeft(time);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  if (!timer || timeLeft === null) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {t("events.heroes.noTimer")}
      </span>
    );
  }

  const isClose = timeLeft < 60000;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "text-xs flex items-center gap-1 font-medium",
            isClose ? "text-orange-400" : "text-green-400",
          )}
        >
          <Clock className="w-3 h-3" />
          {parseMsToTime(timeLeft)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">
          Max spawn:{" "}
          {format(new Date(timer.maxSpawnTime), "HH:mm:ss", { locale: pl })}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export const EventDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });

  const {
    data: event,
    isLoading,
    error,
  } = useEvent({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  const { data: permissions } = useGuildPermissions();

  const { data: heroTimers } = useEventHeroTimers({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    world: event?.world ?? "",
  });

  const { data: heroStats } = useEventHeroStats({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });
  const { deleteHero, updateEvent } = useEventMutations(
    guildId ?? "",
    eventId ?? "",
  );

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedHero, setSelectedHero] = useState<{
    id: string;
    npcId: number;
    npcName: string;
    maps: { id: string; mapId: number; mapName: string }[];
  } | null>(null);

  const canManage =
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  const handleEditHero = (hero: any) => {
    setSelectedHero(hero);
    setHeroDialogOpen(true);
  };

  const handleManageMaps = (hero: any) => {
    setSelectedHero(hero);
    setMapDialogOpen(true);
  };

  const handleDeleteHero = async (heroId: string) => {
    try {
      await deleteHero.mutateAsync(heroId);
      toast.success("Usunięto herosa");
    } catch (e) {
      toast.error("Błąd podczas usuwania");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.error", "Nie znaleziono eventu")}
        </p>
        <Link to="/$guildId/events" params={{ guildId: guildId ?? "" }}>
          <Button variant="outline">Powrót do listy</Button>
        </Link>
      </div>
    );
  }

  const totalMaps = event.heroNpcs?.flatMap((h) => h.maps).length || 0;

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="flex flex-col gap-3">
        {event && (
          <>
            <EventEditDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              event={event}
            />
            <HeroManageDialog
              open={heroDialogOpen}
              onOpenChange={setHeroDialogOpen}
              guildId={guildId ?? ""}
              eventId={eventId ?? ""}
              hero={selectedHero}
            />
            {selectedHero && (
              <MapManageDialog
                open={mapDialogOpen}
                onOpenChange={setMapDialogOpen}
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
                hero={selectedHero}
              />
            )}
          </>
        )}

        {/* Header */}
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold leading-tight">
                {event.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={event.active ? "default" : "secondary"}
                  className="text-xs"
                >
                  {event.active ? t("events.active") : t("events.inactive")}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {event.world.charAt(0).toUpperCase() + event.world.slice(1)}
                </Badge>
                {event.startsAt && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.startsAt), "d MMM yyyy", {
                      locale: pl,
                    })}
                    {event.endsAt && (
                      <>
                        {" - "}
                        {format(new Date(event.endsAt), "d MMM yyyy", {
                          locale: pl,
                        })}
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edytuj
              </Button>
            )}
            {canManage &&
              (event.active ? (
                <ConfirmDeleteDialog
                  title="Zakończyć event?"
                  description="Czy na pewno chcesz zakończyć ten event? Będzie on oznaczony jako nieaktywny."
                  onConfirm={async () => {
                    try {
                      await updateEvent.mutateAsync({
                        active: false,
                      });
                      toast.success("Zakończono event");
                    } catch (e) {
                      toast.error("Błąd podczas zmiany statusu");
                    }
                  }}
                  trigger={
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={updateEvent.isPending}
                    >
                      Zakończ
                    </Button>
                  }
                />
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  disabled={updateEvent.isPending}
                  onClick={async () => {
                    try {
                      await updateEvent.mutateAsync({
                        active: true,
                      });
                      toast.success("Wznowiono event");
                    } catch (e) {
                      toast.error("Błąd podczas zmiany statusu");
                    }
                  }}
                >
                  Wznów
                </Button>
              ))}
          </div>
        </div>

        <div className="px-3 flex flex-col gap-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalMaps}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("events.maps.title")}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {event.rankings?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Uczestników</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Swords className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {event.heroNpcs?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("events.heroes.title")}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Heroes Cards - 2 columns */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Swords className="w-5 h-5 text-yellow-500" />
                  {t("events.heroes.title")}
                </h2>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedHero(null);
                      setHeroDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj
                  </Button>
                )}
              </div>
              {event.heroNpcs?.map((hero) => {
                const timer = heroTimers?.find((t) => t.npcId === hero.npcId);
                const stats = heroStats?.find((s) => s.npcId === hero.npcId);
                const killCount = stats?.killCount ?? 0;

                return (
                  <div key={hero.id} className="relative group">
                    <Link
                      to="/$guildId/events/$eventId/heroes/$heroId"
                      params={{
                        guildId: guildId ?? "",
                        eventId: eventId ?? "",
                        heroId: hero.id,
                      }}
                      className="block"
                    >
                      <Card className="bg-card/40 backdrop-blur-sm border-border hover:bg-card/60 hover:border-primary/30 transition-colors cursor-pointer group-hover:border-primary/30">
                        <div className="p-4 flex items-center justify-between pr-14">
                          <div className="flex items-center gap-3">
                            <Swords className="w-5 h-5 text-yellow-500" />
                            <div>
                              <p className="font-semibold">{hero.npcName}</p>
                              <p className="text-sm text-muted-foreground">
                                ID: {hero.npcId} • {hero.maps?.length || 0}{" "}
                                {t("events.maps.title").toLowerCase()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end gap-1">
                              <HeroTimerDisplay timer={timer} t={t} />
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {killCount}{" "}
                                {killCount === 1
                                  ? t("events.heroes.kill")
                                  : t("events.heroes.kills")}
                              </span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                      </Card>
                    </Link>
                  {canManage && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditHero(hero)}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleManageMaps(hero)}
                          >
                            <MapIcon className="w-4 h-4 mr-2" />
                            Mapy
                          </DropdownMenuItem>
                          <ConfirmDeleteDialog
                            onConfirm={() => handleDeleteHero(hero.id)}
                            title="Usunąć herosa?"
                            description={`Czy na pewno chcesz usunąć herosa ${hero.npcName}? Spowoduje to również usunięcie wszystkich powiązanych map.`}
                            trigger={
                              <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Usuń
                              </div>
                            }
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  </div>
                );
              })}
              {(!event.heroNpcs || event.heroNpcs.length === 0) && (
                <Card className="p-8 bg-card/40 backdrop-blur-sm border-border flex flex-col items-center justify-center">
                  <Swords className="w-10 h-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Brak herosów</p>
                </Card>
              )}
            </div>

            {/* Ranking Preview - 1 column */}
            <div className="space-y-6">
              <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  {t("events.ranking.title")}
                </h2>
                <EventRankingPreview
                  rankings={event.rankings || []}
                  guildId={guildId ?? ""}
                  eventId={eventId ?? ""}
                  limit={5}
                />
              </Card>

              {/* Recent Loots */}
              <EventHeroLoots
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
                world={event.world}
                limit={10}
              />
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
