import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { StatCard } from "./stat-card";

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

const chartConfig = {
  cumulativePh: {
    label: "Skumulowany PH",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function PhGrowthChart({ data, isLoading }: PhGrowthChartProps) {
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
      title="Wzrost PH w czasie"
      description="Historia zdobywania punktów honoru z walk"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Brak danych o walkach z PH"
    >
      <div>
        <div className="bg-muted/30 rounded-lg">
          <div className="p-4">
            <ChartContainer config={chartConfig} className="h-72 w-full">
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
                    labelFormatter={(value) => `Data: ${value}`}
                    formatter={(value, _name, props) => {
                      const ph = props.payload?.ph ?? 0;
                      return [`Łącznie: ${value} PH (+${ph} PH)`, ""];
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
          </div>
        </div>
      </div>
    </StatCard>
  );
}
