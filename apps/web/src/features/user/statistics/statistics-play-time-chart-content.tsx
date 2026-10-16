import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@lootlog/ui/components/chart";
// Loaded only by its lazy wrapper; Recharts stays inside that async boundary.
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import {
  formatStatisticsDay,
  formatStatisticsWeekdayDate,
} from "@/components/common/kill-analytics/format-statistics-date";
import { CHART_SERIES_ANIMATION } from "@/lib/motion";

export type PlayTimePoint = {
  date: string;
  /** Online that day, null before tracking began. */
  seconds: number | null;
  kills: number | null;
};

type StatisticsPlayTimeChartProps = {
  points: PlayTimePoint[];
  formatDuration: (seconds: number) => string;
};

const withRunningTotal = (points: readonly PlayTimePoint[]) => {
  let total = 0;

  return points.map((point) => {
    total += point.seconds ?? 0;

    return { ...point, total, hours: total / 3600 };
  });
};

/** Hours online added up day by day, so the period's total reads at the end. */
export function StatisticsPlayTimeChart({
  points,
  formatDuration,
}: StatisticsPlayTimeChartProps) {
  const { t } = useTranslation();

  const config: ChartConfig = {
    hours: { label: t("statistics.onlineTotal"), color: "var(--primary)" },
  };

  const rows = withRunningTotal(points);
  const rowsByDate = new Map(rows.map((row) => [row.date, row]));

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <AreaChart data={rows} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatStatisticsDay}
          tickLine={false}
          axisLine={false}
          minTickGap={36}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={42}
          fontSize={11}
          allowDecimals={false}
          tickFormatter={(hours: number) => `${Math.round(hours)} h`}
        />
        <ChartTooltip
          content=<ChartTooltipContent
            hideIndicator
            labelFormatter={(date) => formatStatisticsWeekdayDate(String(date))}
            formatter={(_, __, item) => {
              const row = rowsByDate.get(String(item.payload?.date));

              if (!row) return null;

              return (
                <div className="grid gap-0.5">
                  <span>
                    {t("statistics.onlineThatDay", {
                      duration:
                        row.seconds === null
                          ? t("statistics.unknown")
                          : formatDuration(row.seconds),
                    })}
                  </span>
                  {row.kills !== null && (
                    <span className="text-muted-foreground">
                      {t("statistics.count", { count: row.kills })}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {t("statistics.onlineSoFar", {
                      duration: formatDuration(row.total),
                    })}
                  </span>
                </div>
              );
            }}
          />
        />
        <Area
          {...CHART_SERIES_ANIMATION}
          type="monotone"
          dataKey="hours"
          stroke="var(--color-hours)"
          fill="var(--color-hours)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
