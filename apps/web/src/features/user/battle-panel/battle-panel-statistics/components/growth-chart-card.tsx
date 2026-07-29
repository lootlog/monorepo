import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { BattlePanelChartFrame } from "./battle-panel-chart-frame";
import { StatCard } from "./stat-card";

type GrowthChartCardProps = {
  chartData: Record<string, unknown>[];
  color: string;
  dataKey: string;
  description: string;
  emptyMessage: string;
  isLoading?: boolean;
  label: string;
  title: string;
  tooltipDate: (value: unknown) => string;
  tooltipValue: (value: unknown, payload: Record<string, unknown>) => string;
};

export function GrowthChartCard({
  chartData,
  color,
  dataKey,
  description,
  emptyMessage,
  isLoading,
  label,
  title,
  tooltipDate,
  tooltipValue,
}: GrowthChartCardProps) {
  const chartConfig = {
    [dataKey]: { label, color },
  } satisfies ChartConfig;

  return (
    <StatCard
      title={title}
      description={description}
      isLoading={isLoading}
      isEmpty={chartData.length === 0}
      emptyMessage={emptyMessage}
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
                  margin={{ left: -24, top: 20, right: 12, bottom: 20 }}
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
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={tooltipDate}
                        formatter={(value, _name, properties) => [
                          tooltipValue(
                            value,
                            (properties.payload ?? {}) as Record<
                              string,
                              unknown
                            >,
                          ),
                          "",
                        ]}
                      />
                    }
                  />
                  <Line
                    dataKey={dataKey}
                    type="monotone"
                    stroke={`var(--color-${dataKey})`}
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
