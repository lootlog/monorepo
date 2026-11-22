import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@lootlog/ui/components/chart";
// oxlint-disable-next-line react-doctor/prefer-dynamic-import
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { formatIsoWeekday } from "@/components/common/kill-analytics/format-statistics-date";
import { CHART_SERIES_ANIMATION } from "@/lib/motion";
import type { summarizeWeeks } from "./summarize-weeks";

type StatisticsWeekChartProps = {
  days: NonNullable<ReturnType<typeof summarizeWeeks>>["days"];
};

export function StatisticsWeekChart({ days }: StatisticsWeekChartProps) {
  const { t } = useTranslation();

  const config: ChartConfig = {
    previous: {
      label: t("statistics.previousWeek"),
      color: "color-mix(in oklab, var(--muted-foreground) 35%, transparent)",
    },
    current: { label: t("statistics.thisWeek"), color: "var(--primary)" },
  };

  const rows = days.map((day) => ({
    ...day,
    day: formatIsoWeekday(day.weekday, true),
    dayName: formatIsoWeekday(day.weekday),
  }));

  const dayNames = new Map(rows.map((row) => [row.day, row.dayName]));

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={rows} accessibilityLayer barGap={2}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={42}
          fontSize={11}
          allowDecimals={false}
        />
        <ChartTooltip
          content=<ChartTooltipContent
            labelFormatter={(day) => dayNames.get(String(day)) ?? String(day)}
          />
        />
        <ChartLegend content=<ChartLegendContent /> />
        {(["previous", "current"] as const).map((key) => (
          <Bar
            {...CHART_SERIES_ANIMATION}
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
