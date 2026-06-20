import { Flame, Snowflake, TrendingUp, TrendingDown } from "lucide-react";
import type { Streak } from "@/lib/api/battlelog-types";
import { StatCard } from "./stat-card";
import { useTranslation } from "react-i18next";

interface CurrentStreakCardProps {
  data: Streak;
  isLoading?: boolean;
}

export function CurrentStreakCard({ data, isLoading }: CurrentStreakCardProps) {
  const { t } = useTranslation();
  const isWinStreak = data.current.type === "wins";
  const hasStreak = data.current.type !== "none" && data.current.count > 0;

  return (
    <StatCard
      title={t("battlePanel.statistics.currentStreak.title")}
      description={t("battlePanel.statistics.currentStreak.description")}
      isLoading={isLoading}
      isEmpty={false}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center min-h-[160px]">
          <div className="text-center">
            {!hasStreak ? (
              <>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-4xl text-muted-foreground">-</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("battlePanel.statistics.currentStreak.empty")}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center mb-2">
                  {isWinStreak ? (
                    <Flame className="w-12 h-12 text-orange-500 mr-2" />
                  ) : (
                    <Snowflake className="w-12 h-12 text-blue-400 mr-2" />
                  )}
                  <span
                    className={`text-6xl font-bold ${
                      isWinStreak ? "text-orange-500" : "text-blue-400"
                    }`}
                  >
                    {data.current.count}
                  </span>
                </div>
                <p className="text-lg font-medium">
                  {isWinStreak
                    ? t("battlePanel.statistics.currentStreak.winStreak")
                    : t("battlePanel.statistics.currentStreak.lossStreak")}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t">
          <div className="text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-2xl font-bold text-green-600">
                {data.longest.wins}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("battlePanel.statistics.currentStreak.longestWins")}
            </p>
          </div>
          <div className="text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              <span className="text-2xl font-bold text-red-600">
                {data.longest.losses}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("battlePanel.statistics.currentStreak.longestLosses")}
            </p>
          </div>
        </div>
      </div>
    </StatCard>
  );
}
