import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { StatCard } from "./stat-card";
import { useTranslation } from "react-i18next";
import { BattlePanelChartFrame } from "./battle-panel-chart-frame";
import { BATTLE_HEX_COLORS } from "@/components/battle/utils/battle-color-palette";

interface PhGrowthDataPoint {
  date: string;
  ph: number;
  cumulativePh: number;
  battleId: string;
}

interface PhGrowthChartProps {
  data: PhGrowthDataPoint[];
  isLoading?: boolean;
}

export function PhGrowthChart({ data, isLoading }: PhGrowthChartProps) {
  const { t } = useTranslation();
  const chartConfig = {
    cumulativePh: {
      label: t("battlePanel.statistics.phGrowth.chartLabel"),
      color: BATTLE_HEX_COLORS.chart.honorPoints,
    },
  } satisfies ChartConfig;
  const chartData = data.map((point) => ({
    date: new Date(point.date).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
    }),
    cumulativePh: point.cumulativePh,
    ph: point.ph,
  }));

  return (
    <StatCard
      title={t("battlePanel.statistics.phGrowth.title")}
      description={t("battlePanel.statistics.phGrowth.description")}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage={t("battlePanel.statistics.phGrowth.empty")}
    >
      <div className="min-w-0">
        <div className="min-w-0 rounded-lg bg-muted/30">
          <div className="min-w-0 p-4">
            <BattlePanelChartFrame className="h-72 w-full">
              <ChartContainer
                config={chartConfig}
                className="h-full min-w-0 w-full"
              >
                <LineChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: -24,
                    top: 20,
                    right: 12,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={24}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} />
                  <ChartTooltip
                    cursor={false}
                    content=<ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value) =>
                        t("battlePanel.statistics.phGrowth.tooltipDate", {
                          date: value,
                        })
                      }
                      formatter={(value, _name, props) => {
                        const ph = props.payload?.ph ?? 0;
                        return [
                          t("battlePanel.statistics.phGrowth.tooltipValue", {
                            value,
                            ph,
                          }),
                          "",
                        ];
                      }}
                    />
                  />
                  <Line
                    dataKey="cumulativePh"
                    type="monotone"
                    stroke="var(--color-cumulativePh)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </BattlePanelChartFrame>
          </div>
        </div>
      </div>
    </StatCard>
  );
}
