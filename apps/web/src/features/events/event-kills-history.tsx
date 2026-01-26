import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { AlertCircle, Skull, Loader2, Swords } from "lucide-react";
import { useEvent } from "./hooks/queries/use-event";
import { useEventKillHistory } from "./hooks/queries/use-event-kill-history";
import { KillHistoryCard } from "./components/kills/kill-history-card";
import { useState, useEffect } from "react";

export const EventKillsHistory = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId: urlHeroId } = useParams({ strict: false });
  const [selectedHeroId, setSelectedHeroId] = useState<string | undefined>(
    urlHeroId,
  );

  useEffect(() => {
    setSelectedHeroId(urlHeroId);
  }, [urlHeroId]);

  const { data: event, isLoading: eventLoading } = useEvent({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
      <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1.5 rounded-lg bg-red-500/10">
            <Skull className="size-3.5 text-red-500" />
          </div>
          <div>
            <h2 className="text-xs font-semibold leading-tight">
              {t("events.kills.title")}
            </h2>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {selectedHero ? `${selectedHero.npcName} • ` : ""}
              {event.name}
            </p>
          </div>
        </div>
      </div>

      {heroes.length > 0 && (
        <div className="px-3 py-2 bg-background shrink-0 border-b">
          <Tabs
            value={selectedHeroId ?? "all"}
            onValueChange={(value) =>
              setSelectedHeroId(value === "all" ? undefined : value)
            }
          >
            <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="all" className="flex-shrink-0 text-xs">
                {t("events.kills.allHeroes", "Wszyscy herosi")}
              </TabsTrigger>
              {heroes.map((hero) => (
                <TabsTrigger
                  key={hero.id}
                  value={hero.id}
                  className="flex-shrink-0 text-xs"
                >
                  <Swords className="w-3 h-3 mr-1" />
                  {hero.npcName}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {killsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : allKills.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Skull className="w-6 h-6 mb-2 opacity-50" />
          <p className="text-xs">{t("events.kills.noKills")}</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 py-2 space-y-2 flex flex-col">
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
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs">{t("events.kills.loading")}</span>
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
    </div>
  );
};
