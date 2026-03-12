import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEventOverview } from "./hooks/queries/use-event-overview";
import { useEventMaps } from "./hooks/queries/use-event-maps";
import type {
  EventHeroNpc,
  EventMap,
  EventMapLocation,
} from "./hooks/queries/use-events";
import { EventRankingPreview } from "./components/ranking/event-ranking-preview";
import {
  Trophy,
  AlertCircle,
  Swords,
  Plus,
  Clock,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { HeroManageDialog } from "./components/dialogs/hero-manage-dialog";
import { MapManageDialog } from "./components/dialogs/map-manage-dialog";
import { EndEventDialog } from "./components/dialogs/end-event-dialog";
import { ResumeEventDialog } from "./components/dialogs/resume-event-dialog";
import { EventRulesDialog } from "./components/dialogs/event-rules-dialog";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { useEventMutations } from "./hooks/mutations/use-event-mutations";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import { useEventHeroTimers } from "./hooks/queries/use-event-hero-timers";
import { useEventHeroStats } from "./hooks/queries/use-event-hero-stats";
import { useEventRanking } from "./hooks/queries/use-event-ranking";
import { EventHeroLoots } from "./components/stats/event-hero-loots";
import { RecentKillsPreview } from "./components/kills/recent-kills-preview";
import { HeroCard } from "./components/heroes/hero-card";
import { DeleteEventDialog } from "./components/dialogs/delete-event-dialog";
import { EventActionsCard } from "./components/shared/event-actions-card";
import {
  normalizeScoringMode,
  normalizeScoringRules,
} from "./utils/scoring-rules";
import { getEventStatusAtTimestamp } from "./utils";

type EventDetailHero = EventHeroNpc & {
  locations: EventMapLocation[];
  maps: EventMap[];
};

export const EventDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });
  const navigate = useNavigate();
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  const {
    data: event,
    isLoading,
    error,
  } = useEventOverview({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });
  const {
    data: eventMaps,
    isLoading: isMapsLoading,
    error: mapsError,
  } = useEventMaps({
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
  const { data: rankings = [], error: rankingError } = useEventRanking({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });
  const { deleteHero, updateEvent, deleteEvent } = useEventMutations(
    guildId ?? "",
    eventId ?? "",
  );

  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [selectedHero, setSelectedHero] = useState<EventDetailHero | null>(
    null,
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const heroMapsById = new Map(
    (eventMaps?.heroNpcs ?? []).map((hero) => [hero.id, hero]),
  );
  const heroes: EventDetailHero[] = (event?.heroNpcs ?? []).map((hero) => {
    const mapsData = heroMapsById.get(hero.id);
    return {
      ...hero,
      locations: mapsData?.locations ?? [],
      maps: mapsData?.maps ?? [],
    };
  });
  const scoringMode = normalizeScoringMode(event?.scoringMode);
  const scoringRules =
    scoringMode === "ADVANCED"
      ? normalizeScoringRules(event?.scoringRules)
      : null;
  const eventDateRangeLabel = event
    ? `${format(new Date(event.startsAt || event.createdAt), "d MMM yyyy", {
        locale: pl,
      })} - ${
        event.endsAt
          ? format(new Date(event.endsAt), "d MMM yyyy", { locale: pl })
          : t("events.ongoing")
      }`
    : "";

  const canManage =
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
    permissions?.includes(Permission.LOOTLOG_EVENTS_MANAGE) ||
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  const canDeleteEvent =
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);
  const eventStatus =
    event !== undefined && event !== null
      ? getEventStatusAtTimestamp(event, currentTimestamp)
      : "ended";
  const isEventActive = eventStatus === "active";
  const eventStatusLabel =
    eventStatus === "upcoming"
      ? t("events.upcoming")
      : eventStatus === "ended"
        ? t("events.ended")
        : t("events.active");
  const eventStatusVariant =
    eventStatus === "active"
      ? "default"
      : eventStatus === "upcoming"
        ? "outline"
        : "secondary";

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
      await deleteHero.mutateAsync(heroId);
      toast.success(t("events.heroes.deleted"));
    } catch {
      toast.error(t("events.heroes.deleteError"));
    }
  };

  if (isLoading || isMapsLoading) {
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
        <p className="text-muted-foreground">{t("events.error")}</p>
        <Link to="/$guildId/events" params={{ guildId: guildId ?? "" }}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      </div>
    );
  }

  const navigateToEventEdit = () => {
    navigate({
      to: "/$guildId/events/$eventId/edit",
      params: {
        guildId: guildId ?? "",
        eventId: eventId ?? "",
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

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />
      {event && (
        <>
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
          <EndEventDialog
            open={endDialogOpen}
            onOpenChange={setEndDialogOpen}
            eventName={event.name}
            onConfirm={async () => {
              try {
                await updateEvent.mutateAsync({
                  endsAt: new Date().toISOString(),
                });
                toast.success(t("events.endSuccess"));
              } catch {
                toast.error(t("events.statusError"));
              }
            }}
            isPending={updateEvent.isPending}
          />
          <ResumeEventDialog
            open={resumeDialogOpen}
            onOpenChange={setResumeDialogOpen}
            eventName={event.name}
            onConfirm={async () => {
              try {
                await updateEvent.mutateAsync({
                  endsAt: null,
                });
                toast.success(t("events.resumeSuccess"));
              } catch {
                toast.error(t("events.statusError"));
              }
            }}
            isPending={updateEvent.isPending}
          />
          <DeleteEventDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            eventName={event.name}
            requireEventNameConfirmation
            isPending={deleteEvent.isPending}
            onConfirm={async () => {
              try {
                await deleteEvent.mutateAsync();
                toast.success(t("events.deleteSuccess"));
                setDeleteDialogOpen(false);
                navigate({
                  to: "/$guildId/events",
                  params: { guildId: guildId ?? "" },
                });
              } catch {
                toast.error(t("events.deleteError"));
              }
            }}
          />
          <EventRulesDialog
            open={rulesDialogOpen}
            onOpenChange={setRulesDialogOpen}
            eventName={event.name}
            rulebookMarkdown={event.rulebookMarkdown}
            scoringMode={scoringMode}
            scoringRules={scoringRules}
          />
        </>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card/40 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                    <Trophy className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 text-base font-semibold leading-tight break-words">
                        {event.name}
                      </h2>
                      <Badge variant={eventStatusVariant} className="text-xs">
                        {eventStatusLabel}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {event.world.charAt(0).toUpperCase() +
                          event.world.slice(1)}
                      </Badge>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="cursor-help gap-1 text-xs"
                          >
                            <Clock className="w-3 h-3" />
                            {event.assignmentTimeoutMinutes ?? 5} min
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("events.header.assignmentTimeoutTooltip")}</p>
                        </TooltipContent>
                      </Tooltip>

                      <Badge
                        variant="outline"
                        className="order-last flex w-full justify-start gap-1 px-2 py-1 text-xs whitespace-normal sm:order-none sm:w-auto sm:whitespace-nowrap"
                      >
                        <CalendarDays className="mt-0.5 h-3 w-3 shrink-0 sm:mt-0" />
                        <span>{eventDateRangeLabel}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="lg:hidden">
            <EventActionsCard
              canManage={canManage ?? false}
              canDeleteEvent={canDeleteEvent ?? false}
              isActive={isEventActive}
              isUpdatePending={updateEvent.isPending}
              isDeletePending={deleteEvent.isPending}
              onOpenRules={() => setRulesDialogOpen(true)}
              onEdit={navigateToEventEdit}
              onToggleStatus={openEventStatusDialog}
              onDelete={() => setDeleteDialogOpen(true)}
            />
          </div>

          {(mapsError || rankingError) && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mapsError && <p>{t("events.maps.error")}</p>}
              {rankingError && <p>{t("events.ranking.error")}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2 h-fit">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Swords className="w-4 h-4 text-yellow-500" />
                    {t("events.heroes.title")}
                  </h2>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center sm:w-auto"
                      onClick={() => {
                        setSelectedHero(null);
                        setHeroDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("events.heroes.addButton")}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {heroes.map((hero) => (
                    <HeroCard
                      key={hero.id}
                      hero={hero}
                      timer={heroTimers?.find(
                        (t) => hero.npcId !== null && t.npcId === hero.npcId,
                      )}
                      stats={heroStats?.find(
                        (s) => hero.npcId !== null && s.npcId === hero.npcId,
                      )}
                      guildId={guildId ?? ""}
                      eventId={eventId ?? ""}
                      canManage={canManage ?? false}
                      onEditHero={handleEditHero}
                      onManageMaps={handleManageMaps}
                      onDeleteHero={handleDeleteHero}
                      t={t}
                    />
                  ))}
                  {heroes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <Swords className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">{t("events.heroes.empty")}</p>
                    </div>
                  )}
                </div>
              </Card>

              <EventHeroLoots
                guildId={guildId ?? ""}
                heroNpcNames={heroes.map((h) => h.npcName)}
                heroNpcs={heroes}
                showHeroTabs
                world={event.world}
                limit={5}
              />
            </div>

            <div className="space-y-4">
              <div className="hidden lg:block">
                <EventActionsCard
                  canManage={canManage ?? false}
                  canDeleteEvent={canDeleteEvent ?? false}
                  isActive={isEventActive}
                  isUpdatePending={updateEvent.isPending}
                  isDeletePending={deleteEvent.isPending}
                  onOpenRules={() => setRulesDialogOpen(true)}
                  onEdit={navigateToEventEdit}
                  onToggleStatus={openEventStatusDialog}
                  onDelete={() => setDeleteDialogOpen(true)}
                />
              </div>

              <EventRankingPreview
                rankings={rankings}
                heroNpcs={heroes}
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
                limit={5}
              />

              <RecentKillsPreview
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
                heroNpcs={heroes}
                showHeroTabs
                limit={5}
                showHeroName
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
