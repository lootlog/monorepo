// eslint-disable-next-line react-doctor/prefer-dynamic-import -- Both callers (PH and rating chart content) are loaded by lazy wrappers; this shared chart stays inside those async boundaries.
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
      <BattlePanelChartFrame className="h-64 w-full">
        <ChartContainer config={chartConfig} className="h-full min-w-0 w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 0, top: 8, right: 12, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              // Several battles share a day, so neighbouring ticks would repeat the same date.
              minTickGap={48}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              width={44}
              domain={["auto", "auto"]}
            />
            <ChartTooltip
              cursor={false}
              content=<ChartTooltipContent
                indicator="line"
                labelFormatter={(date) => tooltipDate(String(date ?? ""))}
                formatter={(_value, _name, properties) => {
                  const point = chartData.find(
                    (entry) => entry === properties.payload,
                  );

                  return [point ? tooltipValue(point[dataKey], point) : "", ""];
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
    </StatCard>
  );
}
