import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import { AlertCircle, Skull, Swords } from "lucide-react";
import { useEventKillHistory } from "./hooks/queries/use-event-kill-history";
import { KillHistoryCard } from "./components/kills/kill-history-card";
import { useState } from "react";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { EventScrollableTabsList } from "./components/shared/event-scrollable-tabs-list";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  getShowEventOverviewQueryKey,
  useShowEventOverview,
} from "@lootlog/api-client/react-query/main/events";

export const EventKillsHistory = () => {
  const { guildId, eventId, heroId: urlHeroId } = useParams({ strict: false });

  return (
    <EventKillsHistoryContent
      key={urlHeroId ?? "all"}
      guildId={guildId}
      eventId={eventId}
      initialHeroId={urlHeroId}
    />
  );
};

const EventKillsHistoryContent = ({
  guildId,
  eventId,
  initialHeroId,
}: {
  guildId?: string;
  eventId?: string;
  initialHeroId?: string;
}) => {
  const { t } = useTranslation();
  const [selectedHeroId, setSelectedHeroId] = useState<string | undefined>(
    initialHeroId,
  );
  const hasEventRouteParams = Boolean(guildId && eventId);

  const { data: event, isLoading: eventLoading } = useShowEventOverview(
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
  } = useEventKillHistory({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    heroId: selectedHeroId,
    limit: 20,
  });

  const heroes = event?.heroNpcs ?? [];
  const allKills = killsData?.pages.flatMap((page) => page.data) ?? [];
  const selectedHero = selectedHeroId
    ? heroes.find((h) => h.id === selectedHeroId)
    : undefined;

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.error", "Nie znaleziono eventu")}
        </p>
        <Link to="/$guildId/events" params={{ guildId: guildId ?? "" }}>
          <Button variant="outline">{t("events.common.backToEvent")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3">
        <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="rounded-xl bg-red-500/10 p-2 shadow-inner shadow-red-500/10">
              <Skull className="size-4 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("events.kills.title")}
              </p>
              <h2 className="truncate text-base font-semibold">{event.name}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {selectedHero?.npcName ??
                  t("events.kills.allHeroes", "Wszyscy herosi")}
              </p>
            </div>
          </div>
        </Card>

        {heroes.length > 0 && (
          <Card className="gap-2 border-border bg-card/40 p-2.5 backdrop-blur-sm">
            <Tabs
              value={selectedHeroId ?? "all"}
              onValueChange={(value) =>
                setSelectedHeroId(value === "all" ? undefined : value)
              }
            >
              <EventScrollableTabsList>
                <TabsTrigger value="all" className="text-xs">
                  {t("events.kills.allHeroes", "Wszyscy herosi")}
                </TabsTrigger>
                {heroes.map((hero) => (
                  <TabsTrigger
                    key={hero.id}
                    value={hero.id}
                    className="text-xs"
                  >
                    <Swords className="w-3 h-3 mr-1" />
                    {hero.npcName}
                  </TabsTrigger>
                ))}
              </EventScrollableTabsList>
            </Tabs>
          </Card>
        )}

        <Card className="flex min-h-0 flex-1 flex-col gap-2.5 border-border bg-card/40 p-2.5 backdrop-blur-sm">
          {killsLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : allKills.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
              <Skull className="w-6 h-6 mb-2 opacity-50" />
              <p className="text-xs">{t("events.kills.noKills")}</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 flex flex-col">
                {allKills.map((kill) => (
                  <KillHistoryCard
                    key={kill.id}
                    kill={kill}
                    showHeroName
                    compact
                    guildId={guildId}
                    eventId={eventId}
                  />
                ))}

                <div className="py-2 flex items-center justify-center">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Spinner className="w-3 h-3" />
                      <span className="text-xs">
                        {t("events.kills.loading")}
                      </span>
                    </div>
                  ) : hasNextPage ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="text-xs h-7"
                    >
                      {t("events.kills.loadMore")}
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("events.kills.endOfList")}
                    </p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    </div>
  );
};
