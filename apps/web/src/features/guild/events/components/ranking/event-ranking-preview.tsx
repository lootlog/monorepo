import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Trophy, ChevronRight } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import type { EventRanking, EventHeroNpc } from "../../types/api";
import { Card } from "@lootlog/ui/components/card";
import { useState } from "react";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";
import { EventRankingTable } from "./event-ranking-table";

interface EventRankingPreviewProps {
  rankings: EventRanking[];
  heroNpcs: EventHeroNpc[];
  guildId: string;
  eventId: string;
  limit?: number;
}

export const EventRankingPreview = ({
  rankings,
  heroNpcs,
  guildId,
  eventId,
  limit = 5,
}: EventRankingPreviewProps) => {
  const { t } = useTranslation();
  const [selectedHeroName, setSelectedHeroName] = useState<string | null>(null);

  const heroNamesWithRankings = new Set(
    rankings.map((ranking) => ranking.heroNpcName),
  );
  const firstHeroWithRankings = heroNpcs.find((hero) =>
    heroNamesWithRankings.has(hero.npcName),
  );
  const defaultHeroName =
    firstHeroWithRankings?.npcName ?? heroNpcs[0]?.npcName ?? null;
  const effectiveSelectedHeroName =
    selectedHeroName &&
    heroNpcs.some((hero) => hero.npcName === selectedHeroName)
      ? selectedHeroName
      : defaultHeroName;
  const filteredRankings = effectiveSelectedHeroName
    ? rankings.filter(
        (ranking) => ranking.heroNpcName === effectiveSelectedHeroName,
      )
    : rankings;
  const sortedRankings = [...filteredRankings]
    .sort(
      (leftRanking, rightRanking) =>
        rightRanking.totalPoints - leftRanking.totalPoints,
    )
    .slice(0, limit);

  if (heroNpcs.length === 0) {
    return null;
  }

  return (
    <Card className="gap-0 overflow-hidden border-border bg-card p-0">
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Trophy className="size-4 shrink-0 text-primary" />
          <span className="truncate">{t("events.ranking.title")}</span>
        </h2>
        {rankings.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 shrink-0 px-2 text-xs text-muted-foreground"
          >
            <Link
              to="/$guildId/events/$eventId/ranking"
              params={{ guildId, eventId }}
            >
              {t("events.ranking.viewAll")}
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        ) : null}
      </header>

      {heroNpcs.length > 1 && (
        <Tabs
          value={effectiveSelectedHeroName ?? heroNpcs[0]?.npcName}
          onValueChange={setSelectedHeroName}
          className="border-b border-border/70 px-3 py-2"
        >
          <EventScrollableTabsList>
            {heroNpcs.map((hero) => (
              <TabsTrigger
                key={hero.id}
                value={hero.npcName}
                className="flex-shrink-0 text-xs"
              >
                {hero.npcName}
              </TabsTrigger>
            ))}
          </EventScrollableTabsList>
        </Tabs>
      )}

      <div
        key={effectiveSelectedHeroName}
        className="flex min-h-[180px] flex-col animate-in fade-in-0 duration-200"
      >
        {sortedRankings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Trophy className="w-6 h-6 mb-1.5 opacity-50" />
            <p className="text-xs">{t("events.ranking.noRanking")}</p>
          </div>
        ) : (
          <EventRankingTable
            rankings={sortedRankings}
            guildId={guildId}
            eventId={eventId}
            variant="compact"
          />
        )}
      </div>
    </Card>
  );
};
