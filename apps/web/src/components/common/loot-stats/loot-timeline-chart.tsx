import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@lootlog/ui/components/chart";
// Loaded on demand by LootStats; Recharts primitives must share this chart boundary.
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import type { LootStatsResponseDtoOutputTimelineItem } from "@lootlog/client/main";
import { LOOT_RARITY_CHART_COLORS } from "@lootlog/ui/lib/item-rarity-colors";
import { getLootRarityChartConfig } from "./loot-rarity-chart-config";
import { ChartSection } from "@/components/common/chart-section";
import { CHART_SERIES_ANIMATION } from "@/lib/motion";
import {
  formatStatisticsDay,
  formatStatisticsHour,
} from "@/components/common/kill-analytics/format-statistics-date";

// Hourly points are instants shown in Polish time; daily and weekly points are
// the Polish calendar day written as UTC midnight, so they format in UTC.
const tooltipDayFormatter = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const tooltipHourFormatter = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type LootTimelineChartProps = {
  data?: LootStatsResponseDtoOutputTimelineItem[];
  /** Points are hours rather than days or weeks. */
  hourly?: boolean;
  isLoading?: boolean;
};

export const LootTimelineChart: React.FC<LootTimelineChartProps> = ({
  data,
  hourly = false,
  isLoading,
}) => {
  const { t } = useTranslation();

  const chartData =
    data?.map((point) => ({
      date: hourly
        ? formatStatisticsHour(point.date)
        : formatStatisticsDay(point.date.slice(0, 10)),
      fullDate: point.date,
      LEGENDARY: point.byRarity.LEGENDARY ?? 0,
      HEROIC: point.byRarity.HEROIC ?? 0,
      total: point.total,
    })) ?? [];

  return (
    <ChartSection
      title={t("loots.stats.timeline.title")}
      description={t("loots.stats.timeline.description")}
      isLoading={isLoading}
      emptyMessage={
        chartData.length === 0 ? t("loots.stats.timeline.noData") : undefined
      }
    >
      <ChartContainer
        config={getLootRarityChartConfig(t)}
        className="h-64 w-full"
      >
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            width={35}
          />
          <ChartTooltip
            content=<ChartTooltipContent
              labelFormatter={(_, payload) => {
                const item = chartData.find(
                  (point) => point === payload[0]?.payload,
                );

                if (!item) return "";

                return (
                  hourly ? tooltipHourFormatter : tooltipDayFormatter
                ).format(new Date(item.fullDate));
              }}
            />
          />
          <Area
            {...CHART_SERIES_ANIMATION}
            type="monotone"
            dataKey="LEGENDARY"
            stackId="1"
            stroke={LOOT_RARITY_CHART_COLORS.LEGENDARY}
            fill={LOOT_RARITY_CHART_COLORS.LEGENDARY}
            fillOpacity={0.6}
          />
          <Area
            {...CHART_SERIES_ANIMATION}
            type="monotone"
            dataKey="HEROIC"
            stackId="1"
            stroke={LOOT_RARITY_CHART_COLORS.HEROIC}
            fill={LOOT_RARITY_CHART_COLORS.HEROIC}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ChartContainer>
    </ChartSection>
  );
};
