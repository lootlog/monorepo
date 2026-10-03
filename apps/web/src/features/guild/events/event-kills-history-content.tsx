import { sumBy } from "es-toolkit";
import { useState } from "react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  getEventsRankingControllerGetEventHeroStatsQueryKey,
  getShowEventOverviewQueryKey,
  useEventsRankingControllerGetEventHeroStats,
  useShowEventOverview,
  type EventHeroStatsResponseDto,
} from "@lootlog/client/main";

import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { EventLoadError } from "./components/event-load-error";
import { HeroTabs } from "./components/shared/hero-tabs";
import { EventKillsSkeleton } from "./event-kills-skeleton";
import { EventKillsSummary } from "./components/kills/event-kills-summary";
import { EventKillsTable } from "./components/kills/event-kills-table";
import { useEventKillHistory } from "./hooks/queries/use-event-kill-history";

type EventKillsHistoryContentProps = {
  guildId?: string;
  eventId?: string;
  initialHeroId?: string;
};

const getKillCount = (
  heroStats: EventHeroStatsResponseDto[] | undefined,
  selectedHeroId: string | undefined,
) => {
  if (!heroStats) return undefined;

  if (selectedHeroId) {
    return (
      heroStats.find((heroStatistic) => heroStatistic.heroId === selectedHeroId)
        ?.killCount ?? 0
    );
  }

  return sumBy(heroStats, (heroStatistic) => heroStatistic.killCount);
};

const getEventRouteIds = (guildId?: string, eventId?: string) => ({
  eventId: eventId ?? "",
  guildId: guildId ?? "",
});

export const EventKillsHistoryContent = ({
  guildId,
  eventId,
  initialHeroId,
}: EventKillsHistoryContentProps) => {
  const [selectedHeroId, setSelectedHeroId] = useState<string | undefined>(
    initialHeroId,
  );

  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

  const hasEventRouteParams = Boolean(guildId && eventId);
  const routeIds = getEventRouteIds(guildId, eventId);

  const {
    data: event,
    isLoading: eventLoading,
    error: eventError,
    refetch: refetchEvent,
  } = useShowEventOverview(
    {
      guildId: routeIds.guildId,
      eventId: routeIds.eventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getShowEventOverviewQueryKey({
          guildId: routeIds.guildId,
          eventId: routeIds.eventId,
        }),
      },
    },
  );

  const {
    data: killsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: killsLoading,
    isError: killsHasError,
    isFetchNextPageError,
    isFetching,
    refetch,
  } = useEventKillHistory({
    guildId: routeIds.guildId,
    eventId: routeIds.eventId,
    heroId: selectedHeroId,
    limit: 20,
  });

  const {
    data: heroStats,
    isError: heroStatsHasError,
    isLoading: heroStatsLoading,
  } = useEventsRankingControllerGetEventHeroStats(
    {
      guildId: routeIds.guildId,
      eventId: routeIds.eventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getEventsRankingControllerGetEventHeroStatsQueryKey({
          guildId: routeIds.guildId,
          eventId: routeIds.eventId,
        }),
      },
    },
  );

  if (eventLoading) {
    return <EventKillsSkeleton />;
  }

  if (eventError || !event) {
    return (
      <EventLoadError
        backTo="event"
        guildId={routeIds.guildId}
        eventId={routeIds.eventId}
        error={eventError}
        onRetry={() => refetchEvent()}
      />
    );
  }

  const heroes = event.heroNpcs ?? [];
  const allKills = killsData?.pages.flatMap((page) => page.data) ?? [];

  const selectedHero = selectedHeroId
    ? heroes.find((hero) => hero.id === selectedHeroId)
    : undefined;

  const killCount = getKillCount(
    heroStatsHasError ? undefined : heroStats,
    selectedHeroId,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea ref={setScrollElement} className="min-h-0 flex-1">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-3 px-3 py-3">
          <EventKillsSummary
            eventName={event.name}
            heroName={selectedHero?.npcName}
            killCount={killCount}
            isKillCountLoading={heroStatsLoading}
          />

          <HeroTabs
            placement="page"
            heroes={heroes}
            includeAll
            value={selectedHeroId}
            onValueChange={setSelectedHeroId}
          />

          <EventKillsTable
            kills={allKills}
            guildId={routeIds.guildId}
            eventId={routeIds.eventId}
            scrollElement={scrollElement}
            resetKey={selectedHeroId ?? "all"}
            isLoading={killsLoading}
            hasError={killsHasError}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            onRetry={() =>
              void (isFetchNextPageError ? fetchNextPage() : refetch())
            }
            isRetrying={isFetching}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
