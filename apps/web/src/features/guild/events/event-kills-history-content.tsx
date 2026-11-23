import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useShowEvent } from "@lootlog/client/main";

import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { EventLoadError } from "./components/event-load-error";
import { HeroTabs } from "./components/shared/hero-tabs";
import { EventHeader } from "./components/header/event-header";
import { EventKillsSkeleton } from "./event-kills-skeleton";
import { EventKillsTable } from "./components/kills/event-kills-table";
import { EVENT_HISTORY_PAGE_SIZE } from "./components/shared/event-history-page-size";
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

  const [eventHeroId, setEventHeroId] = useState<string | undefined>();
  const selectedHeroId = initialHeroId ?? eventHeroId;

  const navigate = useNavigate();

  const handleHeroChange = (heroId: string | undefined) => {
    if (!initialHeroId || !guildId || !eventId) {
      setEventHeroId(heroId);

      return;
    }

    void navigate(
      heroId
        ? {
            to: "/$guildId/events/$eventId/heroes/$heroId/kills",
            params: { guildId, eventId, heroId },
          }
        : {
            to: "/$guildId/events/$eventId/kills",
            params: { guildId, eventId },
          },
    );
  };

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
  } = useShowEvent(
    {
      guildId: routeIds.guildId,
      eventId: routeIds.eventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
      },
    },
  );

  const killsQuery = useEventKillHistory({
    guildId: routeIds.guildId,
    eventId: routeIds.eventId,
    heroId: selectedHeroId,
    limit: EVENT_HISTORY_PAGE_SIZE,
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
  const allKills = killsQuery.data?.pages.flatMap((page) => page.items) ?? [];

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
        {initialHeroId ? (
          <h1 className="sr-only">{t("events.kills.title")}</h1>
        ) : (
          <EventHeader tab="kills" />
        )}
        <HeroTabs
          placement="page"
          heroes={heroes}
          includeAll
          value={selectedHeroId}
          onValueChange={handleHeroChange}
        />
        <EventKillsTable
          kills={allKills}
          guildId={routeIds.guildId}
          eventId={routeIds.eventId}
          scrollElement={scrollElement}
          resetKey={selectedHeroId ?? "all"}
          query={killsQuery}
          onShowAllHeroes={
            selectedHeroId ? () => handleHeroChange(undefined) : undefined
          }
        />
      </ScrollArea>
    </div>
  );
};
