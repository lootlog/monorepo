import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { AlertCircle, ChevronLeft, Skull, Loader2, Swords } from "lucide-react";
import { useEvent } from "./hooks/use-event";
import { useEventKillHistory } from "./hooks/use-event-kill-history";
import { KillHistoryCard } from "./components/kill-history-card";
import { useState } from "react";

export const EventKillsHistory = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });
  const [selectedHeroId, setSelectedHeroId] = useState<string | undefined>(
    undefined,
  );

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

  const isLoading = eventLoading || killsLoading;
  const heroes = event?.heroNpcs ?? [];
  const allKills = killsData?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) {
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
    <ScrollArea className="h-full bg-background/50">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
          <Link
            to="/$guildId/events/$eventId"
            params={{
              guildId: guildId ?? "",
              eventId: eventId ?? "",
            }}
            className="mr-3"
          >
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Skull className="size-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">
                {t("events.kills.allKillsTitle", "Historia zabić eventu")}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                {event.name}
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 pb-6">
          {/* Hero Filter Tabs */}
          {heroes.length > 0 && (
            <Tabs
              value={selectedHeroId ?? "all"}
              onValueChange={(value) =>
                setSelectedHeroId(value === "all" ? undefined : value)
              }
              className="mb-4"
            >
              <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="all" className="flex-shrink-0">
                  {t("events.kills.allHeroes", "Wszyscy herosi")}
                </TabsTrigger>
                {heroes.map((hero) => (
                  <TabsTrigger
                    key={hero.id}
                    value={hero.id}
                    className="flex-shrink-0"
                  >
                    <Swords className="w-3 h-3 mr-1" />
                    {hero.npcName}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {allKills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Skull className="w-12 h-12 mb-4 opacity-50" />
              <p>{t("events.kills.noKills")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allKills.map((kill) => (
                <KillHistoryCard key={kill.id} kill={kill} showHeroName expanded />
              ))}

              {/* Load more */}
              <div className="py-4 flex items-center justify-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("events.kills.loading")}</span>
                  </div>
                ) : hasNextPage ? (
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {t("events.kills.loadMore")}
                  </Button>
                ) : allKills.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("events.kills.endOfList")}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};
