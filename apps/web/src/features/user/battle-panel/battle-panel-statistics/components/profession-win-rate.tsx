import { formatBattleMetric } from "@/components/battle/utils/value-utils";
import { clamp } from "es-toolkit";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { getProfessionColor, getProfessionName } from "@/lib/utils/professions";
import { useTranslation } from "react-i18next";
import { StatsLeaderboardSection } from "@/components/common/stats-leaderboard-section";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";

interface ProfessionWinRate {
  prof: string;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
}

interface ProfessionWinRateChartProps {
  data: ProfessionWinRate[];
  isLoading?: boolean;
}

/** Margonem's six professions, so the loading rows match the loaded list. */
const PROFESSION_COUNT = 6;

export function ProfessionWinRateChart({
  data,
  isLoading,
}: ProfessionWinRateChartProps) {
  const { t } = useTranslation();
  const rows = [...data].sort((a, b) => b.totalBattles - a.totalBattles);

  return (
    <StatsLeaderboardSection
      title={t("battlePanel.statistics.professionWinRate.title")}
      isLoading={isLoading}
      loadingRows={PROFESSION_COUNT}
      emptyMessage={
        data.length === 0
          ? t("battlePanel.statistics.professionWinRate.empty")
          : undefined
      }
    >
      {rows.map((row) => (
        <li
          key={row.prof}
          data-list-tile
          className={cn(
            "flex min-h-12 min-w-0 flex-col justify-center gap-1.5 py-2",
            LIST_TILE_RULE_CLASS,
            LIST_TILE_INSET_CLASS,
          )}
        >
          <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">
              {getProfessionName(row.prof)}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              <span className={BATTLE_TEXT_COLORS.result.won}>{row.wins}</span>
              {" – "}
              <span className={BATTLE_TEXT_COLORS.result.lost}>
                {row.losses}
              </span>
              <span className="ml-3 text-sm font-semibold text-foreground">
                {formatBattleMetric(row.winRate)}%
              </span>
            </span>
          </div>
          <div
            role="meter"
            aria-label={t(
              "battlePanel.statistics.professionWinRate.tooltipBattles",
              {
                profession: getProfessionName(row.prof),
                count: row.totalBattles,
              },
            )}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={row.winRate}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${clamp(row.winRate, 0, 100)}%`,
                backgroundColor: getProfessionColor(row.prof),
              }}
            />
          </div>
        </li>
      ))}
    </StatsLeaderboardSection>
  );
}
