import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { EventRulesDialog } from "./components/dialogs/event-rules-dialog";
import { EventSummaryDialog } from "./components/dialogs/event-summary-dialog";
import { HeroManageDialog } from "./components/dialogs/hero-manage-dialog";
import { MapManageDialog } from "./components/dialogs/map-manage-dialog";
import { EventHeroesTable } from "./components/heroes/event-heroes-table";
import { RecentKillsPreview } from "./components/kills/recent-kills-preview";
import { EventRankingPreview } from "./components/ranking/event-ranking-preview";
import { EventActionsCard } from "./components/shared/event-actions-card";
import { EventHeroLoots } from "./components/stats/event-hero-loots";
import { EventDetailHeader } from "./event-detail-header";
import { EventDetailSkeleton } from "./event-detail-skeleton";
import { EventStatusDialogs } from "./event-status-dialogs";
import { findEventHeroTimer } from "./utils/find-event-hero-timer";

import { hasEventDetailErrors, useEventDetail } from "./use-event-detail";

export const EventDetail = () => {
  const {
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
  } = useEventDetail();
  if (isLoading || isMapsLoading) {
    return <EventDetailSkeleton />;
  }
  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 max-h-full overflow-y-auto [justify-content:safe_center]">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{t("events.error")}</p>
        <Link to="/$guildId/events" params={{ guildId: queryGuildId }}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      </div>
    );
  }
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
            guildId={queryGuildId}
            eventId={queryEventId}
            hero={selectedHero}
          />
          {selectedHero && (
            <MapManageDialog
              open={mapDialogOpen}
              onOpenChange={setMapDialogOpen}
              guildId={queryGuildId}
              eventId={queryEventId}
              hero={selectedHero}
            />
          )}
          <EventStatusDialogs
            endDialogOpen={endDialogOpen}
            setEndDialogOpen={setEndDialogOpen}
            event={event}
            updateEvent={updateEvent}
            queryGuildId={queryGuildId}
            queryEventId={queryEventId}
            t={t}
            resumeDialogOpen={resumeDialogOpen}
            setResumeDialogOpen={setResumeDialogOpen}
            deleteDialogOpen={deleteDialogOpen}
            setDeleteDialogOpen={setDeleteDialogOpen}
            deleteEvent={deleteEvent}
            navigate={navigate}
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
            guildId={queryGuildId}
            eventId={queryEventId}
            eventName={event.name}
          />
        </>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-3">
          <EventDetailHeader
            event={event}
            eventStatusVariant={eventStatusVariant}
            eventStatusLabel={eventStatusLabel}
            t={t}
            eventDateRangeLabel={eventDateRangeLabel}
            isPinPending={isPinPending}
            eventIsPinned={eventIsPinned}
            pinActionLabel={pinActionLabel}
            eventId={eventId}
            isEventActive={isEventActive}
            togglePin={togglePin}
            queryGuildId={queryGuildId}
            queryEventId={queryEventId}
            setSummaryDialogOpen={setSummaryDialogOpen}
            setRulesDialogOpen={setRulesDialogOpen}
          />

          <div className="xl:hidden">
            <EventActionsCard
              canManage={canManage}
              canDeleteEvent={canDeleteEvent}
              isActive={isEventActive}
              isUpdatePending={updateEvent.isPending}
              isDeletePending={deleteEvent.isPending}
              onEdit={navigateToEventEdit}
              onToggleStatus={openEventStatusDialog}
              onDelete={() => setDeleteDialogOpen(true)}
            />
          </div>

          {hasEventDetailErrors(mapsError, rankingError) && (
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
                  guildId={queryGuildId}
                  eventId={queryEventId}
                  canManage={canManage}
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
                  guildId={queryGuildId}
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
                  canManage={canManage}
                  canDeleteEvent={canDeleteEvent}
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
                  guildId={queryGuildId}
                  eventId={queryEventId}
                  limit={5}
                />
              </div>

              <div className="order-3 xl:order-none">
                <RecentKillsPreview
                  guildId={queryGuildId}
                  eventId={queryEventId}
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
