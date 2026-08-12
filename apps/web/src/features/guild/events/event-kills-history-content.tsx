import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  getShowEventOverviewQueryKey,
  useShowEventOverview,
} from "@lootlog/api-client/react-query/main/events";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { EventKillsFilter } from "./components/kills/event-kills-filter";
import { EventKillsList } from "./components/kills/event-kills-list";
import { EventKillsSummary } from "./components/kills/event-kills-summary";
import { useEventKillHistory } from "./hooks/queries/use-event-kill-history";

type EventKillsHistoryContentProps = {
  guildId?: string;
  eventId?: string;
  initialHeroId?: string;
};

export const EventKillsHistoryContent = ({
  guildId,
  eventId,
  initialHeroId,
}: EventKillsHistoryContentProps) => {
  const { t } = useTranslation();
  const [selectedHeroId, setSelectedHeroId] = useState<string | undefined>(
    initialHeroId,
  );
  const hasEventRouteParams = Boolean(guildId && eventId);
  const {
    data: event,
    isLoading: eventLoading,
    error: eventError,
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
    data: killsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: killsLoading,
    error: killsError,
  } = useEventKillHistory({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    heroId: selectedHeroId,
    limit: 20,
  });

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
        <Link to="/$guildId/events" params={{ guildId: guildId ?? "" }}>
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-3 px-3 py-3">
          <EventKillsSummary
            eventName={event.name}
            heroName={selectedHero?.npcName}
          />

          <EventKillsFilter
            heroes={heroes}
            selectedHeroId={selectedHeroId}
            onSelectedHeroChange={setSelectedHeroId}
          />

          {killsError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t("events.error")}
            </div>
          )}

          <EventKillsList
            kills={allKills}
            guildId={guildId ?? ""}
            eventId={eventId ?? ""}
            isLoading={killsLoading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
