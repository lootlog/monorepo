import {
  BATTLE_SURFACE_COLORS,
  BATTLE_TEXT_COLORS,
} from "@/components/battle/utils/battle-color-palette";
import type { BattleDurationStats } from "@/lib/api/battlelog-types";
import { intervalToDuration } from "date-fns";
import { Clock, Zap, Hourglass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatCard } from "./stat-card";
import { cn } from "@lootlog/ui/lib/utils";

interface BattleDurationStatsCardProps {
  data: BattleDurationStats;
  isLoading?: boolean;
}

const formatDuration = (seconds: number): string => {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  const minutes = duration.minutes || 0;
  const secs = duration.seconds || 0;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

export function BattleDurationStatsCard({
  data,
  isLoading,
}: BattleDurationStatsCardProps) {
  const { t } = useTranslation();
  const hasData =
    data.avgWinDuration > 0 ||
    data.avgLossDuration > 0 ||
    data.fastest ||
    data.longest;

  return (
    <StatCard
      title={t("battlePanel.statistics.battleDuration.title")}
      description={t("battlePanel.statistics.battleDuration.description")}
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage={t("battlePanel.statistics.battleDuration.empty")}
    >
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-2 gap-4 min-h-[160px] items-center">
          <div
            className={cn(
              "text-center p-4 rounded-lg border",
              BATTLE_SURFACE_COLORS.metric.positiveBox,
            )}
          >
            <div className="flex items-center justify-center mb-2">
              <Clock
                className={cn(
                  "w-5 h-5 mr-2",
                  BATTLE_TEXT_COLORS.metric.positive,
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  BATTLE_TEXT_COLORS.metric.positive,
                )}
              >
                {t("battlePanel.filters.results.won")}
              </span>
            </div>
            <p className="text-3xl font-bold">
              {data.avgWinDuration > 0
                ? formatDuration(data.avgWinDuration)
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("battlePanel.statistics.cards.averageTime")}
            </p>
          </div>

          <div
            className={cn(
              "text-center p-4 rounded-lg border",
              BATTLE_SURFACE_COLORS.metric.negativeBox,
            )}
          >
            <div className="flex items-center justify-center mb-2">
              <Clock
                className={cn(
                  "w-5 h-5 mr-2",
                  BATTLE_TEXT_COLORS.metric.negative,
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  BATTLE_TEXT_COLORS.metric.negative,
                )}
              >
                {t("battlePanel.filters.results.lost")}
              </span>
            </div>
            <p className="text-3xl font-bold">
              {data.avgLossDuration > 0
                ? formatDuration(data.avgLossDuration)
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("battlePanel.statistics.cards.averageTime")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t">
          <div className="text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-2">
              <Zap
                className={cn(
                  "w-4 h-4 mr-1",
                  BATTLE_TEXT_COLORS.metric.average,
                )}
              />
              <span className="text-sm font-medium">
                {t("battlePanel.statistics.cards.fastest")}
              </span>
            </div>
            <p
              className={cn(
                "text-2xl font-bold",
                BATTLE_TEXT_COLORS.metric.average,
              )}
            >
              {data.fastest ? formatDuration(data.fastest.duration) : "-"}
            </p>
          </div>
          <div className="text-center flex flex-col justify-center">
            <div className="flex items-center justify-center mb-2">
              <Hourglass
                className={cn(
                  "w-4 h-4 mr-1",
                  BATTLE_TEXT_COLORS.metric.secondary,
                )}
              />
              <span className="text-sm font-medium">
                {t("battlePanel.statistics.cards.longest")}
              </span>
            </div>
            <p
              className={cn(
                "text-2xl font-bold",
                BATTLE_TEXT_COLORS.metric.secondary,
              )}
            >
              {data.longest ? formatDuration(data.longest.duration) : "-"}
            </p>
          </div>
        </div>
      </div>
    </StatCard>
  );
}
