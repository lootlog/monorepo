import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Trophy, ChevronRight } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import type { EventRanking, EventHeroNpc } from "../../hooks/queries/use-events";
import { cn } from "@lootlog/ui/lib/utils";
import { Card } from "@lootlog/ui/components/card";
import { useState } from "react";

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

  const firstHeroWithRankings = heroNpcs.find((hero) =>
    rankings.some((r) => r.heroNpcName === hero.npcName),
  );
  const defaultHeroName =
    firstHeroWithRankings?.npcName ?? heroNpcs[0]?.npcName ?? null;

  const [selectedHeroName, setSelectedHeroName] = useState<string | null>(
    defaultHeroName,
  );

  const filteredRankings = selectedHeroName
    ? rankings.filter((r) => r.heroNpcName === selectedHeroName)
    : rankings;

  const sortedRankings = [...filteredRankings]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit);

  if (heroNpcs.length === 0) {
    return null;
  }

  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4" />
        {t("events.ranking.title")}
      </h2>

      {heroNpcs.length > 1 && (
        <Tabs
          value={selectedHeroName ?? heroNpcs[0]?.npcName}
          onValueChange={setSelectedHeroName}
          className="mb-3"
        >
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {heroNpcs.map((hero) => (
              <TabsTrigger
                key={hero.id}
                value={hero.npcName}
                className="flex-shrink-0 text-xs"
              >
                {hero.npcName}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div
        key={selectedHeroName}
        className="h-[180px] flex flex-col animate-in fade-in-0 duration-200"
      >
        {sortedRankings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Trophy className="w-6 h-6 mb-1.5 opacity-50" />
            <p className="text-xs">{t("events.ranking.noRanking")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sortedRankings.map((ranking, index) => {
              const position = index + 1;
              const isTop3 = position <= 3;

              return (
                <div
                  key={ranking.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 rounded-md transition-colors",
                    isTop3 ? "bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      position === 1 && "bg-yellow-500 text-yellow-950",
                      position === 2 && "bg-gray-300 text-gray-800",
                      position === 3 && "bg-amber-700 text-amber-100",
                      position > 3 && "bg-muted text-muted-foreground",
                    )}
                  >
                    {position}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {ranking.member?.name || `Gracz #${ranking.memberId}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {t("events.ranking.pointCount", {
                        count: ranking.totalPoints,
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {rankings.length > 0 && (
        <Link
          to="/$guildId/events/$eventId/ranking"
          params={{ guildId, eventId }}
          className="block mt-3"
        >
          <Button variant="outline" className="w-full" size="sm">
            {t("events.ranking.viewAll")}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
    </Card>
  );
};
