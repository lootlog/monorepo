import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { Flame, Snowflake, TrendingUp, TrendingDown } from "lucide-react";
import type { Streak } from "@/lib/api/battlelog-types";
import { StatCard } from "./stat-card";
import { StatCardMetric } from "./stat-card-metric";
import { useTranslation } from "react-i18next";
import { cn } from "cn";

interface CurrentStreakCardProps {
  data: Streak;
  isLoading?: boolean;
}

export function CurrentStreakCard({ data, isLoading }: CurrentStreakCardProps) {
  const { t } = useTranslation();
  const isWinStreak = data.current.type === "wins";
  const hasStreak = data.current.type !== "none" && data.current.count > 0;
  const StreakIcon = isWinStreak ? Flame : Snowflake;

  const streakColor = isWinStreak
    ? BATTLE_TEXT_COLORS.metric.winStreak
    : BATTLE_TEXT_COLORS.metric.lossStreak;

  return (
    <StatCard
      title={t("battlePanel.statistics.currentStreak.title")}
      description={t("battlePanel.statistics.currentStreak.description")}
      isLoading={isLoading}
    >
      <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 text-center">
        {hasStreak ? (
          <>
            <div className={cn("flex items-center gap-2", streakColor)}>
              <StreakIcon className="size-9" aria-hidden="true" />
              <span className="text-5xl font-bold leading-none tabular-nums">
                {data.current.count}
              </span>
            </div>
            <p className="text-sm font-medium">
              {isWinStreak
                ? t("battlePanel.statistics.currentStreak.winStreak")
                : t("battlePanel.statistics.currentStreak.lossStreak")}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("battlePanel.statistics.currentStreak.empty")}
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
        <StatCardMetric
          icon={TrendingUp}
          label={t("battlePanel.statistics.currentStreak.longestWins")}
          value={data.longest.wins}
          valueClassName={BATTLE_TEXT_COLORS.metric.positive}
        />
        <StatCardMetric
          icon={TrendingDown}
          label={t("battlePanel.statistics.currentStreak.longestLosses")}
          value={data.longest.losses}
          valueClassName={BATTLE_TEXT_COLORS.metric.negative}
        />
      </div>
    </StatCard>
  );
}
