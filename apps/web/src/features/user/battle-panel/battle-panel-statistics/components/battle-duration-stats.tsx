import {
  BATTLE_SURFACE_COLORS,
  BATTLE_TEXT_COLORS,
} from "@/components/battle/utils/battle-color-palette";
import { formatDurationCompact } from "@/features/guild/events/utils/format-duration";
import type { BattleDurationStats } from "@/lib/api/battlelog-types";
import { Zap, Hourglass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatCard } from "./stat-card";
import { StatCardMetric } from "./stat-card-metric";
import { cn } from "cn";

interface BattleDurationStatsCardProps {
  data: BattleDurationStats;
  isLoading?: boolean;
}

const formatDuration = (seconds: number | undefined) =>
  seconds === undefined ? "–" : formatDurationCompact(Math.round(seconds));

// An average of zero means there were no battles with that result.
const getAverage = (seconds: number) => (seconds > 0 ? seconds : undefined);

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

  const averages = [
    {
      key: "won",
      label: t("battlePanel.filters.results.won"),
      value: formatDuration(getAverage(data.avgWinDuration)),
      boxClassName: BATTLE_SURFACE_COLORS.metric.positiveBox,
      labelClassName: BATTLE_TEXT_COLORS.metric.positive,
    },
    {
      key: "lost",
      label: t("battlePanel.filters.results.lost"),
      value: formatDuration(getAverage(data.avgLossDuration)),
      boxClassName: BATTLE_SURFACE_COLORS.metric.negativeBox,
      labelClassName: BATTLE_TEXT_COLORS.metric.negative,
    },
  ];

  return (
    <StatCard
      title={t("battlePanel.statistics.battleDuration.title")}
      description={t("battlePanel.statistics.battleDuration.description")}
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage={t("battlePanel.statistics.battleDuration.empty")}
    >
      <div className="grid min-h-40 flex-1 grid-cols-2 items-stretch gap-3">
        {averages.map((average) => (
          <div
            key={average.key}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center",
              average.boxClassName,
            )}
          >
            <span className={cn("text-xs font-medium", average.labelClassName)}>
              {average.label}
            </span>
            <span className="text-3xl font-bold leading-none tabular-nums">
              {average.value}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("battlePanel.statistics.cards.averageTime")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
        <StatCardMetric
          icon={Zap}
          label={t("battlePanel.statistics.cards.fastest")}
          value={formatDuration(data.fastest?.duration)}
          valueClassName={BATTLE_TEXT_COLORS.metric.average}
        />
        <StatCardMetric
          icon={Hourglass}
          label={t("battlePanel.statistics.cards.longest")}
          value={formatDuration(data.longest?.duration)}
          valueClassName={BATTLE_TEXT_COLORS.metric.secondary}
        />
      </div>
    </StatCard>
  );
}
