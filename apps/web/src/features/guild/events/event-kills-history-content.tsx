import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  getShowEventOverviewQueryKey,
  useShowEventOverview,
} from "@lootlog/client/main";

import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { EventLoadError } from "./components/event-load-error";
import { HeroTabs } from "./components/shared/hero-tabs";
import { EventKillsSkeleton } from "./event-kills-skeleton";
import { EventKillsTable } from "./components/kills/event-kills-table";
import { useEventKillHistory } from "./hooks/queries/use-event-kill-history";

type EventKillsHistoryContentProps = {
  guildId?: string;
  eventId?: string;
  initialHeroId?: string;
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea
        data-under-top-bar
        ref={setScrollElement}
        className="min-h-0 flex-1"
      >
        <h1 className="sr-only">{t("events.kills.title")}</h1>
        <HeroTabs
          placement="page"
          heroes={heroes}
          includeAll
          value={selectedHeroId}
          onValueChange={setSelectedHeroId}
        />
        <div className="flex w-full min-w-0 max-w-full flex-col gap-3 px-3 py-3">
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
