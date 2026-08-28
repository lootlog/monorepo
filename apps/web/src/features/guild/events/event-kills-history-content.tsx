import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  getEventsRankingControllerGetEventHeroStatsQueryKey,
  getShowEventOverviewQueryKey,
  useEventsRankingControllerGetEventHeroStats,
  useShowEventOverview,
} from "@lootlog/api-client/react-query/main/events";
import type { EventHeroStatsResponseDto } from "@lootlog/api-client/models/main/event-hero-stats-response-dto";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { EventKillsFilter } from "./components/kills/event-kills-filter";
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

  return heroStats.reduce(
    (totalKillCount, heroStatistic) => totalKillCount + heroStatistic.killCount,
    0,
  );
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
  const { t } = useTranslation();
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
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-muted-foreground">{t("events.error")}</p>
        <Link to="/$guildId/events" params={{ guildId: routeIds.guildId }}>
          <Button variant="outline">{t("events.common.backToEvent")}</Button>
        </Link>
      </div>
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
    <div className="flex h-full min-h-0 flex-col bg-background">
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

          <EventKillsFilter
            heroes={heroes}
            selectedHeroId={selectedHeroId}
            onSelectedHeroChange={setSelectedHeroId}
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
          />
        </div>
      </ScrollArea>
    </div>
  );
};
