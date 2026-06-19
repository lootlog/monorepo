import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { getProfessionName, getProfessionColor } from "@/lib/utils/professions";
import { StatCard } from "./stat-card";
import { useTranslation } from "react-i18next";
import { BattlePanelChartFrame } from "./battle-panel-chart-frame";

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

export function ProfessionWinRateChart({
  data,
  isLoading,
}: ProfessionWinRateChartProps) {
  const { t } = useTranslation();
  const chartConfig = {
    winRate: {
      label: t("battlePanel.statistics.professionWinRate.chartLabel"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;
  const chartData = data.map((item) => ({
    ...item,
    professionName: getProfessionName(item.prof),
  }));

  return (
    <StatCard
      title={t("battlePanel.statistics.professionWinRate.title")}
      description={t("battlePanel.statistics.professionWinRate.description")}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage={t("battlePanel.statistics.professionWinRate.empty")}
    >
      <div className="min-w-0">
        <div className="min-w-0 rounded-lg bg-muted/30 p-4">
          <BattlePanelChartFrame className="h-[300px] w-full">
            <ChartContainer
              config={chartConfig}
              className="h-full min-w-0 w-full"
            >
              <BarChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: -24,
                  top: 20,
                  right: 12,
                  bottom: 20,
                }}
                barCategoryGap="40%"
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="professionName"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={[0, 100]}
                />
                <ChartTooltip
                  cursor={false}
                  content=<ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value, payload) => {
                      const item = payload[0]
                        ?.payload as unknown as ProfessionWinRate;
                      return t(
                        "battlePanel.statistics.professionWinRate.tooltipBattles",
                        {
                          profession: value,
                          count: item?.totalBattles ?? 0,
                        },
                      );
                    }}
                    formatter={(value) => [`${value}%`]}
                  />
                />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getProfessionColor(entry.prof)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </BattlePanelChartFrame>
        </div>
      </div>
    </StatCard>
  );
}
