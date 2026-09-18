import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@lootlog/ui/components/chart";
// Loaded on demand by LootStats; Recharts primitives must share this chart boundary.
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import type { LootStatsResponseDtoOutputTopNpcsItem } from "@lootlog/client/main";
import {
  getLootRarityChartConfig,
  LOOT_RARITY_COLORS,
} from "./loot-rarity-chart-config";
import { StatsChartCard } from "./stats-chart-card";

type LootTopNpcsChartProps = {
  data?: LootStatsResponseDtoOutputTopNpcsItem[];
  isLoading?: boolean;
};

export const LootTopNpcsChart: React.FC<LootTopNpcsChartProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();

  const chartData =
    data?.map((npc) => ({
      name: npc.name.length > 20 ? `${npc.name.slice(0, 18)}...` : npc.name,
      // Several monsters share a name across level brackets.
      fullName: `${npc.name} · ${t("kills.level", { level: npc.lvl })}`,
      type: npc.type,
      lvl: npc.lvl,
      LEGENDARY: npc.byRarity?.LEGENDARY ?? 0,
      HEROIC: npc.byRarity?.HEROIC ?? 0,
      total: npc.count,
    })) ?? [];

  return (
    <StatsChartCard
      title={t("loots.stats.topNpcs.title")}
      description={t("loots.stats.topNpcs.description")}
      isLoading={isLoading}
      emptyMessage={
        chartData.length === 0 ? t("loots.stats.topNpcs.noData") : undefined
      }
    >
      <ChartContainer
        config={getLootRarityChartConfig(t)}
        className="h-full min-h-[250px] w-full flex-1"
      >
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 10, right: 10 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={120}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <XAxis type="number" hide />
          <ChartTooltip
            content=<ChartTooltipContent
              labelFormatter={(_, payload) => {
                const item = chartData.find(
                  (point) => point === payload[0]?.payload,
                );

                return String(item?.fullName ?? "");
              }}
            />
          />
          <ChartLegend content=<ChartLegendContent /> />
          <Bar
            dataKey="LEGENDARY"
            stackId="a"
            fill={LOOT_RARITY_COLORS.LEGENDARY}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="HEROIC"
            stackId="a"
            fill={LOOT_RARITY_COLORS.HEROIC}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
    </StatsChartCard>
  );
};
