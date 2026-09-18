import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@lootlog/ui/components/chart";
// Loaded on demand by LootStats; Recharts primitives must share this chart boundary.
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import type {
  LootStatsResponseDtoOutputTimelineItem,
  LootsControllerGetLootStatsPeriod,
} from "@lootlog/client/main";
import {
  getLootRarityChartConfig,
  LOOT_RARITY_COLORS,
} from "./loot-rarity-chart-config";
import { StatsChartCard } from "./stats-chart-card";

type LootTimelineChartProps = {
  data?: LootStatsResponseDtoOutputTimelineItem[];
  period?: LootsControllerGetLootStatsPeriod;
  isLoading?: boolean;
  className?: string;
};

export const LootTimelineChart: React.FC<LootTimelineChartProps> = ({
  data,
  period = "7d",
  isLoading,
  className,
}) => {
  const { t } = useTranslation();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);

    if (period === "24h" || period === "3d") {
      return date.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (period === "7d" || period === "14d" || period === "30d") {
      return date.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
      });
    }

    return date.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const chartData =
    data?.map((point) => ({
      date: formatDate(point.date),
      fullDate: point.date,
      LEGENDARY: point.byRarity.LEGENDARY ?? 0,
      HEROIC: point.byRarity.HEROIC ?? 0,
      total: point.total,
    })) ?? [];

  return (
    <StatsChartCard
      title={t("loots.stats.timeline.title")}
      description={t("loots.stats.timeline.description")}
      className={className}
      isLoading={isLoading}
      emptyMessage={
        chartData.length === 0 ? t("loots.stats.timeline.noData") : undefined
      }
    >
      <ChartContainer
        config={getLootRarityChartConfig(t)}
        className="h-[250px] w-full flex-1"
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
                const fullDate = item.fullDate;
                const date = new Date(fullDate);

                return date.toLocaleDateString("pl-PL", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }}
            />
          />
          <Area
            type="monotone"
            dataKey="LEGENDARY"
            stackId="1"
            stroke={LOOT_RARITY_COLORS.LEGENDARY}
            fill={LOOT_RARITY_COLORS.LEGENDARY}
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="HEROIC"
            stackId="1"
            stroke={LOOT_RARITY_COLORS.HEROIC}
            fill={LOOT_RARITY_COLORS.HEROIC}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ChartContainer>
    </StatsChartCard>
  );
};
