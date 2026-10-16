import { EventLoadError } from "./components/event-load-error";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { HeroManageDialog } from "./components/dialogs/hero-manage-dialog";
import { MapManageDialog } from "./components/dialogs/map-manage-dialog";
import { EventHeader } from "./components/header/event-header";
import { EventHeroesTable } from "./components/heroes/event-heroes-table";
import { RecentKillsPreview } from "./components/kills/recent-kills-preview";
import { EventRankingPreview } from "./components/ranking/event-ranking-preview";
import { EventHeroLoots } from "./components/stats/event-hero-loots";
import { EventDetailSkeleton } from "./event-detail-skeleton";
import { findEventHeroTimer } from "./utils/find-event-hero-timer";

import { useEventDetail } from "./use-event-detail";
import { useCurrentMember } from "./hooks/queries/use-current-member";
import { getMyHeroScores } from "./utils/my-hero-scores";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";
import { EventOverviewColumns } from "./event-overview-columns";

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
    t,
    error,
    canManage,
    refetchEvent,
    mapsError,
    rankingError,
    refetchMaps,
    refetchRanking,
    isMapsFetching,
    isRankingFetching,
    heroes,
    heroTimers,
    heroStats,
    setSelectedHeroId,
    handleEditHero,
    handleManageMaps,
    handleDeleteHero,
    isDeleteHeroPending,
    rankings,
    isLoading,
    isMapsLoading,
  } = useEventDetail();

  const { data: currentMember } = useCurrentMember(queryGuildId);

  if (isLoading || isMapsLoading) {
    return <EventDetailSkeleton />;
  }

  if (error || !event) {
    return (
      <EventLoadError
        backTo="list"
        guildId={queryGuildId}
        error={error}
        onRetry={() => refetchEvent()}
      />
    );
  }

  const scores = getMyHeroScores(heroes, rankings, currentMember?.id);

  const heroesTable = (
    <EventHeroesTable
      rows={heroes.map((hero, index) => ({
        hero,
        score: scores[index],
        timer: findEventHeroTimer(heroTimers, {
          heroNpcId: hero.npcId,
          heroName: hero.npcName,
        }),
        stats: heroStats?.find(
          (statistic) => hero.npcId !== null && statistic.npcId === hero.npcId,
        ),
      }))}
      guildId={queryGuildId}
      eventId={queryEventId}
      canManage={canManage}
      onAddHero={() => {
        setSelectedHeroId(null);
        setHeroDialogOpen(true);
      }}
      onEditHero={handleEditHero}
      onManageMaps={handleManageMaps}
      onDeleteHero={handleDeleteHero}
      isDeleteHeroPending={isDeleteHeroPending}
      showStandings
    />
  );

  const recentKills = (
    <RecentKillsPreview
      guildId={queryGuildId}
      eventId={queryEventId}
      limit={10}
    />
  );

  const recentLoots = (
    <EventHeroLoots
      guildId={queryGuildId}
      heroNpcNames={heroes.map((h) => h.npcName)}
      heroNpcs={heroes}
      world={event.world}
      limit={8}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />
      {heroDialogOpen && (
        <HeroManageDialog
          key={selectedHero?.id ?? "new"}
          open={heroDialogOpen}
          onOpenChange={setHeroDialogOpen}
          guildId={queryGuildId}
          eventId={queryEventId}
          hero={selectedHero}
        />
      )}
      {selectedHero && (
        <MapManageDialog
          key={selectedHero.id}
          open={mapDialogOpen}
          onOpenChange={setMapDialogOpen}
          guildId={queryGuildId}
          eventId={queryEventId}
          hero={selectedHero}
        />
      )}

      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <EventHeader tab="overview" />
        <div className="min-w-0">
          {mapsError && (
            <QueryErrorNotice
              message={t("events.maps.error")}
              onRetry={() => void refetchMaps()}
              isRetrying={isMapsFetching}
              className={LIST_TILE_RULE_CLASS}
            />
          )}
          {rankingError && (
            <QueryErrorNotice
              message={t("events.ranking.error")}
              onRetry={() => void refetchRanking()}
              isRetrying={isRankingFetching}
              className={LIST_TILE_RULE_CLASS}
            />
          )}
          <EventOverviewColumns
            heroes={heroesTable}
            loots={recentLoots}
            ranking={
              <EventRankingPreview
                rankings={rankings}
                heroNpcs={heroes}
                guildId={queryGuildId}
                eventId={queryEventId}
                limit={5}
              />
            }
            kills={recentKills}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
