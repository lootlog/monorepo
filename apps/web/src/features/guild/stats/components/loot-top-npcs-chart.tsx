import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import type { LootStatsResponseDtoOutputTopNpcsItem } from "@/lib/api/generated/main/model/loot-stats-response-dto-output-top-npcs-item";

const RARITY_COLORS = {
  LEGENDARY: "#ef4444",
  HEROIC: "#3b82f6",
};

const chartConfig: ChartConfig = {
  LEGENDARY: {
    label: "Legendarne",
    color: RARITY_COLORS.LEGENDARY,
  },
  HEROIC: {
    label: "Heroiczne",
    color: RARITY_COLORS.HEROIC,
  },
};

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
      fullName: npc.name,
      type: npc.type,
      lvl: npc.lvl,
      LEGENDARY: npc.byRarity?.LEGENDARY ?? 0,
      HEROIC: npc.byRarity?.HEROIC ?? 0,
      total: npc.count,
    })) ?? [];

  if (isLoading) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3 flex flex-col">
        <h2 className="text-base font-semibold">
          {t("loots.stats.topNpcs.title")}
        </h2>
        <div className="flex-1">
          <Skeleton className="h-full min-h-[250px] w-full" />
        </div>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3 flex flex-col">
        <h2 className="text-base font-semibold">
          {t("loots.stats.topNpcs.title")}
        </h2>
        <div className="flex-1">
          <div className="flex h-full min-h-[250px] items-center justify-center text-muted-foreground">
            {t("loots.stats.topNpcs.noData")}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border p-3 gap-3 flex flex-col">
      <h2 className="text-base font-semibold">
        {t("loots.stats.topNpcs.title")}
      </h2>
      <div className="flex-1">
        <ChartContainer
          config={chartConfig}
          className="h-full min-h-[280px] w-full"
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
                  const item = payload[0]?.payload as
                    | Record<string, unknown>
                    | undefined;
                  return String(item?.fullName ?? "");
                }}
              />
            />
            <ChartLegend content=<ChartLegendContent /> />
            <Bar
              dataKey="LEGENDARY"
              stackId="a"
              fill={RARITY_COLORS.LEGENDARY}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="HEROIC"
              stackId="a"
              fill={RARITY_COLORS.HEROIC}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </Card>
  );
};
