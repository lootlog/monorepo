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
import { PieChart, Pie, Cell } from "recharts";
import { useTranslation } from "react-i18next";
import type { LootStatsResponseDtoOutputByRarity } from "@lootlog/client/main";

const RARITY_COLORS: Record<"LEGENDARY" | "HEROIC", string> = {
  LEGENDARY: "#ef4444",
  HEROIC: "#3b82f6",
};

const RARITY_ORDER: ("LEGENDARY" | "HEROIC")[] = ["LEGENDARY", "HEROIC"];

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

type LootRarityChartProps = {
  data?: LootStatsResponseDtoOutputByRarity;
  isLoading?: boolean;
};

export const LootRarityChart: React.FC<LootRarityChartProps> = ({
  data,
  isLoading,
}) => {
  const { t } = useTranslation();

  const filteredData = RARITY_ORDER.filter((rarity) => data?.[rarity]);
  const filteredTotal = filteredData.reduce(
    (sum, rarity) => sum + (data?.[rarity]?.count ?? 0),
    0,
  );

  const chartData = filteredData.map((rarity) => {
    const count = data?.[rarity]?.count ?? 0;
    return {
      name: rarity,
      value: count,
      percentage:
        filteredTotal > 0
          ? Math.round((count / filteredTotal) * 100 * 10) / 10
          : 0,
      fill: RARITY_COLORS[rarity],
    };
  });

  const hasData = chartData.some((item) => item.value > 0);

  if (isLoading) {
    return (
      <Card className="bg-card  border-border p-3 gap-3">
        <h2 className="text-base font-semibold">
          {t("loots.stats.rarity.title")}
        </h2>
        <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" />
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="bg-card  border-border p-3 gap-3">
        <h2 className="text-base font-semibold">
          {t("loots.stats.rarity.title")}
        </h2>
        <div className="flex h-[200px] items-center justify-center text-muted-foreground">
          {t("loots.stats.rarity.noData")}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card  border-border p-3 gap-3">
      <h2 className="text-base font-semibold">
        {t("loots.stats.rarity.title")}
      </h2>
      <div>
        <ChartContainer config={chartConfig} className="mx-auto h-[250px]">
          <PieChart>
            <ChartTooltip
              content=<ChartTooltipContent
                hideLabel
                formatter={(value, name, item) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-[2px]"
                        style={{
                          backgroundColor: String(item.payload?.fill ?? ""),
                        }}
                      />
                      <span className="text-muted-foreground">
                        {chartConfig[name as "LEGENDARY" | "HEROIC"]?.label ??
                          String(name)}
                      </span>
                    </div>
                    <span className="font-mono font-medium tabular-nums">
                      {Number(value).toLocaleString()} (
                      {String(item.payload?.percentage ?? 0)}%)
                    </span>
                  </div>
                )}
              />
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content=<ChartLegendContent
                nameKey="name"
                className="flex-wrap"
              />
            />
          </PieChart>
        </ChartContainer>
      </div>
    </Card>
  );
};
