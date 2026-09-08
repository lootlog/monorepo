import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { BattlePanelChartFrame } from "./battle-panel-chart-frame";
import { StatCard } from "./stat-card";

type GrowthChartCardProps<TData extends { date: string }> = {
  chartData: TData[];
  color: string;
  dataKey: keyof TData & string;
  description: string;
  emptyMessage: string;
  isLoading?: boolean;
  label: string;
  title: string;
  tooltipDate: (value: string) => string;
  tooltipValue: (value: TData[keyof TData], payload: TData) => string;
};

export function GrowthChartCard<TData extends { date: string }>({
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
}: GrowthChartCardProps<TData>) {
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
                    content=<ChartTooltipContent
                      indicator="line"
                      labelFormatter={(date) => tooltipDate(String(date ?? ""))}
                      formatter={(_value, _name, properties) => {
                        const point = chartData.find(
                          (entry) => entry === properties.payload,
                        );
                        return [
                          point ? tooltipValue(point[dataKey], point) : "",
                          "",
                        ];
                      }}
                    />
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
