import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@lootlog/ui/components/chart";
// Loaded only by its lazy wrapper; Recharts stays inside that async boundary.
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import {
  formatStatisticsDate,
  formatStatisticsDay,
} from "@/components/common/kill-analytics/format-statistics-date";
import { CHART_SERIES_ANIMATION } from "@/lib/motion";
import { FACTION_WAR_STYLE } from "./faction-war-faction-style";
import {
  FACTION_WAR_SIDES,
  type getFactionWarDailyRows,
} from "./faction-war-standings";

type FactionWarDailyChartProps = {
  rows: ReturnType<typeof getFactionWarDailyRows>;
};

/** Each faction's score on every day of the war, side by side. */
export function FactionWarDailyChart({ rows }: FactionWarDailyChartProps) {
  const { t } = useTranslation();

  const config: ChartConfig = Object.fromEntries(
    FACTION_WAR_SIDES.map((faction) => [
      faction,
      {
        label: t(`factionWar.factions.${faction}`),
        color: FACTION_WAR_STYLE[faction].color,
      },
    ]),
  );

  // Multiplied scores carry fractions; players read whole points.
  const data = rows.map((row) => ({
    day: row.day,
    BARBATOS: Math.round(row.BARBATOS),
    TANROTH: Math.round(row.TANROTH),
  }));

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={data} accessibilityLayer barGap={2}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(day: string) => formatStatisticsDay(day)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          fontSize={11}
          allowDecimals={false}
        />
        <ChartTooltip
          content=<ChartTooltipContent
            labelFormatter={(day) => formatStatisticsDate(String(day))}
          />
        />
        <ChartLegend content=<ChartLegendContent /> />
        {FACTION_WAR_SIDES.map((faction) => (
          <Bar
            {...CHART_SERIES_ANIMATION}
            key={faction}
            dataKey={faction}
            fill={`var(--color-${faction})`}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
