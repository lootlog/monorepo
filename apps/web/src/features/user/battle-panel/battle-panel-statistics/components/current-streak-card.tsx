import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { Flame, Snowflake, TrendingUp, TrendingDown } from "lucide-react";
import type { Streak } from "@/lib/api/battlelog-types";
import { StatCard } from "./stat-card";
import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";

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
                    <Flame
                      className={cn(
                        "w-12 h-12 mr-2",
                        BATTLE_TEXT_COLORS.metric.winStreak,
                      )}
                    />
                  ) : (
                    <Snowflake
                      className={cn(
                        "w-12 h-12 mr-2",
                        BATTLE_TEXT_COLORS.metric.lossStreak,
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "text-6xl font-bold",
                      isWinStreak
                        ? BATTLE_TEXT_COLORS.metric.winStreak
                        : BATTLE_TEXT_COLORS.metric.lossStreak,
                    )}
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
              <TrendingUp
                className={cn(
                  "w-4 h-4 mr-1",
                  BATTLE_TEXT_COLORS.metric.positive,
                )}
              />
              <span
                className={cn(
                  "text-2xl font-bold",
                  BATTLE_TEXT_COLORS.metric.positive,
                )}
              >
                {data.longest.wins}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("battlePanel.statistics.currentStreak.longestWins")}
            </p>
          </div>
          <div className="text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingDown
                className={cn(
                  "w-4 h-4 mr-1",
                  BATTLE_TEXT_COLORS.metric.negative,
                )}
              />
              <span
                className={cn(
                  "text-2xl font-bold",
                  BATTLE_TEXT_COLORS.metric.negative,
                )}
              >
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
