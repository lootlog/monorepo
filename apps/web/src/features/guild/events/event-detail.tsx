import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import type { EventHeroNpc, EventMap, EventMapLocation } from "./types/api";
import { EventRankingPreview } from "./components/ranking/event-ranking-preview";
import {
  Trophy,
  AlertCircle,
  Clock,
  CalendarDays,
  BookText,
  Sparkles,
  Crosshair,
  Globe2,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { HeroManageDialog } from "./components/dialogs/hero-manage-dialog";
import { MapManageDialog } from "./components/dialogs/map-manage-dialog";
import { EventActionDialog } from "./components/dialogs/event-action-dialog";
import { EventRulesDialog } from "./components/dialogs/event-rules-dialog";
import { EventSummaryDialog } from "./components/dialogs/event-summary-dialog";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import { EventHeroLoots } from "./components/stats/event-hero-loots";
import { RecentKillsPreview } from "./components/kills/recent-kills-preview";
import { EventHeroesTable } from "./components/heroes/event-heroes-table";
import { EventActionsCard } from "./components/shared/event-actions-card";
import { findEventHeroTimer } from "./utils/find-event-hero-timer";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/scoring";
import { getEventStatusAtTimestamp } from "./utils/event-activity";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
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
} from "@lootlog/api-client/react-query/main/events";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { invalidateEventDetailQueries } from "./hooks/mutations/invalidate-event-queries";
import { useToggleEventPin } from "./hooks/mutations/use-toggle-event-pin";
import { cn } from "@/utils/cn";

type EventDetailHero = EventHeroNpc & {
  locations: EventMapLocation[];
  maps: EventMap[];
};

export const EventDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    togglePin,
    isPinned,
    isLoading: isPinLoading,
  } = useToggleEventPin(guildId ?? "");
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const hasEventRouteParams = Boolean(guildId && eventId);
  const eventIsPinned = eventId ? isPinned(eventId) : false;
  const pinActionLabel = t(
    eventIsPinned ? "events.unpinEvent" : "events.pinEvent",
  );

  const {
    data: event,
    isLoading,
    error,
  } = useShowEventOverview(
    {
      guildId: guildId ?? "",
      eventId: eventId ?? "",
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getShowEventOverviewQueryKey({
          guildId: guildId ?? "",
          eventId: eventId ?? "",
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
      guildId: guildId ?? "",
      eventId: eventId ?? "",
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getListEventMapsQueryKey({
          guildId: guildId ?? "",
          eventId: eventId ?? "",
        }),
      },
    },
  );

  const { data: permissions } = useGuildPermissions();

  const { data: heroTimers } = useListEventHeroTimers(
    {
      guildId: guildId ?? "",
      eventId: eventId ?? "",
    },
    {
      world: event?.world ?? "",
    },
    {
      query: {
        enabled: hasEventRouteParams && Boolean(event?.world),
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

  const { data: heroStats } = useEventsRankingControllerGetEventHeroStats(
    {
      guildId: guildId ?? "",
      eventId: eventId ?? "",
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getEventsRankingControllerGetEventHeroStatsQueryKey({
          guildId: guildId ?? "",
          eventId: eventId ?? "",
        }),
      },
    },
  );
  const { data: rankings = [], error: rankingError } = useListEventRanking(
    {
      guildId: guildId ?? "",
      eventId: eventId ?? "",
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getListEventRankingQueryKey({
          guildId: guildId ?? "",
          eventId: eventId ?? "",
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
  const scoringMode = normalizeEventScoringMode(event?.scoringMode);
  const scoringRules =
    scoringMode === "ADVANCED"
      ? normalizeEventScoringRules(event?.scoringRules)
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
      await deleteHero.mutateAsync({
        pathParams: {
          guildId: guildId ?? "",
          eventId: eventId ?? "",
          heroId,
        },
      });
      toast.success(t("events.heroes.deleted"));
    } catch {
      toast.error(t("events.heroes.deleteError"));
    }
  };

  if (isLoading || isMapsLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-background">
        <div className="px-3 py-3 flex flex-col gap-3">
          <Card className="gap-4 border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-32 rounded-full" />
                </div>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <Card className="p-3 bg-card  border-border gap-2">
                <Skeleton className="h-5 w-32 mb-3" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex flex-col gap-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </Card>
            </div>
            <div className="space-y-3">
              <Card className="p-3 bg-card  border-border gap-2">
                <Skeleton className="h-5 w-24 mb-3" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-4 w-6" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
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
    <div className="flex flex-col h-full min-h-0 bg-background">
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
          <EventActionDialog
            open={endDialogOpen}
            onOpenChange={setEndDialogOpen}
            eventName={event.name}
            titleKey="events.endDialog.title"
            descriptionKey="events.endDialog.description"
            actionLabelKey="events.end"
            variant="destructive"
            onConfirm={async () => {
              try {
                await updateEvent.mutateAsync({
                  pathParams: {
                    guildId: guildId ?? "",
                    eventId: eventId ?? "",
                  },
                  data: {
                    endsAt: new Date().toISOString(),
                  },
                });
                toast.success(t("events.endSuccess"));
              } catch {
                toast.error(t("events.statusError"));
              }
            }}
            isPending={updateEvent.isPending}
          />
          <EventActionDialog
            open={resumeDialogOpen}
            onOpenChange={setResumeDialogOpen}
            eventName={event.name}
            titleKey="events.resumeDialog.title"
            descriptionKey="events.resumeDialog.description"
            actionLabelKey="events.resume"
            onConfirm={async () => {
              try {
                await updateEvent.mutateAsync({
                  pathParams: {
                    guildId: guildId ?? "",
                    eventId: eventId ?? "",
                  },
                  data: {
                    endsAt: null as never,
                  },
                });
                toast.success(t("events.resumeSuccess"));
              } catch {
                toast.error(t("events.statusError"));
              }
            }}
            isPending={updateEvent.isPending}
          />
          <EventActionDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            eventName={event.name}
            requireNameConfirmation
            titleKey="events.deleteDialog.title"
            descriptionKey="events.deleteDialog.description"
            actionLabelKey="events.delete"
            variant="destructive"
            isPending={deleteEvent.isPending}
            onConfirm={async () => {
              try {
                await deleteEvent.mutateAsync({
                  pathParams: {
                    guildId: guildId ?? "",
                    eventId: eventId ?? "",
                  },
                });
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
          <EventSummaryDialog
            open={summaryDialogOpen}
            onOpenChange={setSummaryDialogOpen}
            guildId={guildId ?? ""}
            eventId={eventId ?? ""}
            eventName={event.name}
          />
        </>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-3">
          <Card className="gap-0 overflow-hidden border-border bg-card p-0">
            <div className="flex items-start gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="min-w-0 break-words text-lg font-semibold leading-tight">
                    {event.name}
                  </h2>
                  <Badge
                    variant={eventStatusVariant}
                    className="h-5 px-2 text-[11px]"
                  >
                    {eventStatusLabel}
                  </Badge>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Globe2 className="size-3.5" />
                    {event.world.charAt(0).toUpperCase() + event.world.slice(1)}
                  </span>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <Clock className="size-3.5" />
                          {t("events.header.assignmentTimeoutValue", {
                            minutes: event.assignmentTimeoutMinutes ?? 5,
                          })}
                        </button>
                      }
                    />
                    <TooltipContent>
                      <p>{t("events.header.assignmentTimeoutTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>

                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <CalendarDays className="size-3.5 shrink-0" />
                    <span>{eventDateRangeLabel}</span>
                  </span>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={pinActionLabel}
                      aria-pressed={eventIsPinned}
                      disabled={!eventId || isPinLoading}
                      className={cn(
                        "h-9 shrink-0 gap-2 px-3",
                        eventIsPinned
                          ? "border-yellow-500/35 bg-yellow-500/10 text-yellow-500 hover:border-yellow-500/50 hover:bg-yellow-500/15 hover:text-yellow-500"
                          : "border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
                      )}
                      onClick={() => {
                        if (eventId) {
                          togglePin(eventId);
                        }
                      }}
                    >
                      <Star
                        className={cn(
                          "size-4",
                          eventIsPinned && "fill-current",
                        )}
                      />
                      <span className="hidden sm:inline">{pinActionLabel}</span>
                    </Button>
                  }
                />
                <TooltipContent>{pinActionLabel}</TooltipContent>
              </Tooltip>
            </div>

            <div className="grid gap-1 border-t border-border bg-muted/20 p-1.5 sm:grid-cols-3">
              <Button
                size="sm"
                variant="ghost"
                className="w-full min-w-0 justify-center text-muted-foreground hover:text-foreground"
                render={
                  <Link
                    to="/$guildId/events/$eventId/coordination"
                    params={{ guildId: guildId ?? "", eventId: eventId ?? "" }}
                  >
                    <Crosshair className="size-3.5" />
                    {t("events.coordination.trigger")}
                  </Link>
                }
                nativeButton={false}
              />
              <Button
                size="sm"
                variant="ghost"
                className="w-full min-w-0 justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setSummaryDialogOpen(true)}
              >
                <Sparkles className="size-3.5" />
                {t("events.summaryDialog.trigger")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-full min-w-0 justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setRulesDialogOpen(true)}
              >
                <BookText className="size-3.5" />
                {t("events.rulesDialog.trigger")}
              </Button>
            </div>
          </Card>

          <div className="xl:hidden">
            <EventActionsCard
              canManage={canManage ?? false}
              canDeleteEvent={canDeleteEvent ?? false}
              isActive={isEventActive}
              isUpdatePending={updateEvent.isPending}
              isDeletePending={deleteEvent.isPending}
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
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            <div className="contents xl:block xl:min-w-0 xl:space-y-3">
              <div className="order-1 xl:order-none">
                <EventHeroesTable
                  rows={heroes.map((hero) => ({
                    hero,
                    timer: findEventHeroTimer(heroTimers, {
                      heroNpcId: hero.npcId,
                      heroName: hero.npcName,
                    }),
                    stats: heroStats?.find(
                      (statistic) =>
                        hero.npcId !== null && statistic.npcId === hero.npcId,
                    ),
                  }))}
                  guildId={guildId ?? ""}
                  eventId={eventId ?? ""}
                  canManage={canManage ?? false}
                  onAddHero={() => {
                    setSelectedHero(null);
                    setHeroDialogOpen(true);
                  }}
                  onEditHero={handleEditHero}
                  onManageMaps={handleManageMaps}
                  onDeleteHero={handleDeleteHero}
                />
              </div>

              <div className="order-4 xl:order-none">
                <EventHeroLoots
                  guildId={guildId ?? ""}
                  heroNpcNames={heroes.map((h) => h.npcName)}
                  heroNpcs={heroes}
                  showHeroTabs
                  world={event.world}
                  limit={5}
                />
              </div>
            </div>

            <div className="contents xl:block xl:min-w-0 xl:space-y-3">
              <div className="hidden xl:block">
                <EventActionsCard
                  canManage={canManage ?? false}
                  canDeleteEvent={canDeleteEvent ?? false}
                  isActive={isEventActive}
                  isUpdatePending={updateEvent.isPending}
                  isDeletePending={deleteEvent.isPending}
                  onEdit={navigateToEventEdit}
                  onToggleStatus={openEventStatusDialog}
                  onDelete={() => setDeleteDialogOpen(true)}
                />
              </div>

              <div className="order-2 xl:order-none">
                <EventRankingPreview
                  rankings={rankings}
                  heroNpcs={heroes}
                  guildId={guildId ?? ""}
                  eventId={eventId ?? ""}
                  limit={5}
                />
              </div>

              <div className="order-3 xl:order-none">
                <RecentKillsPreview
                  guildId={guildId ?? ""}
                  eventId={eventId ?? ""}
                  heroNpcs={heroes}
                  showHeroTabs
                  limit={5}
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
