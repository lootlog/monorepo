import { clamp } from "es-toolkit";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { getProfessionColor, getProfessionName } from "@/lib/utils/professions";
import { useTranslation } from "react-i18next";
import { StatCard } from "./stat-card";

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

const percentFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 1,
});

export function ProfessionWinRateChart({
  data,
  isLoading,
}: ProfessionWinRateChartProps) {
  const { t } = useTranslation();
  const rows = [...data].sort((a, b) => b.totalBattles - a.totalBattles);

  return (
    <StatCard
      title={t("battlePanel.statistics.professionWinRate.title")}
      description={t("battlePanel.statistics.professionWinRate.description")}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage={t("battlePanel.statistics.professionWinRate.empty")}
    >
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.prof} className="flex min-w-0 flex-col gap-1.5">
            <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">
                {getProfessionName(row.prof)}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                <span className={BATTLE_TEXT_COLORS.result.won}>
                  {row.wins}
                </span>
                {" – "}
                <span className={BATTLE_TEXT_COLORS.result.lost}>
                  {row.losses}
                </span>
                <span className="ml-3 text-sm font-semibold text-foreground">
                  {percentFormatter.format(row.winRate)}%
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
              className="h-2 overflow-hidden rounded-full bg-muted"
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
      </ul>
    </StatCard>
  );
}
