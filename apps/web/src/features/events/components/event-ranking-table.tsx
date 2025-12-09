import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";
import type { EventRanking } from "../hooks/use-events";
import { cn } from "@lootlog/ui/lib/utils";

interface EventRankingTableProps {
  rankings: EventRanking[];
}

export const EventRankingTable = ({ rankings }: EventRankingTableProps) => {
  const { t } = useTranslation();

  if (rankings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Trophy className="w-10 h-10 mb-2 opacity-50" />
        <p>{t("events.ranking.noRanking")}</p>
      </div>
    );
  }

  const sortedRankings = [...rankings].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  return (
    <div className="space-y-2">
      {sortedRankings.map((ranking, index) => {
        const position = index + 1;
        const isTop3 = position <= 3;

        return (
          <div
            key={ranking.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              isTop3 ? "bg-primary/5" : "hover:bg-muted/50",
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                position === 1 && "bg-yellow-500 text-yellow-950",
                position === 2 && "bg-gray-300 text-gray-800",
                position === 3 && "bg-amber-700 text-amber-100",
                position > 3 && "bg-muted text-muted-foreground",
              )}
            >
              {position}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {ranking.member?.name || `Gracz #${ranking.memberId}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("events.ranking.killCount", { count: ranking.totalKills })}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="font-bold text-primary">
                {t("events.ranking.pointCount", { count: ranking.totalPoints })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
