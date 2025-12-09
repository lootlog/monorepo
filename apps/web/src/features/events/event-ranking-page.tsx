import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEvent } from "./hooks/use-event";
import { EventRankingTable } from "./components/event-ranking-table";
import { Trophy, AlertCircle, Swords } from "lucide-react";
import { useState } from "react";

export const EventRankingPage = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  const {
    data: event,
    isLoading,
    error,
  } = useEvent({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.error", "Nie znaleziono eventu")}
        </p>
        <Link to="/$guildId/events" params={{ guildId: guildId ?? "" }}>
          <Button variant="outline">Powrót do listy</Button>
        </Link>
      </div>
    );
  }

  const heroes = event.heroNpcs || [];
  const rankings = event.rankings || [];

  // For now we show all rankings since the data model doesn't support per-hero filtering
  // In future, if EventRanking has heroNpcId, we can filter here
  const filteredRankings = rankings;

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="flex flex-col gap-6 p-4">
        {/* Header */}
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">
                {t("events.ranking.title")}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                {event.name}
              </p>
            </div>
          </div>
        </div>

        {/* Hero Tabs */}
        {heroes.length > 0 && (
          <Tabs
            value={selectedHeroId ?? "all"}
            onValueChange={(value) =>
              setSelectedHeroId(value === "all" ? null : value)
            }
          >
            <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="all" className="flex-shrink-0">
                {t("events.ranking.allHeroes", "Wszyscy herosi")}
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

        {/* Ranking Table */}
        <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
          <EventRankingTable rankings={filteredRankings} />
        </Card>
      </div>
    </ScrollArea>
  );
};
