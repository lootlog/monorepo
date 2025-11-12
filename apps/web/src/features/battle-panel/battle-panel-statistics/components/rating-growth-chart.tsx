import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { StatCard } from "./stat-card";

interface RatingGrowthDataPoint {
  date: string;
  ratingDelta: number;
  rating: number;
  battleId: string;
}

interface RatingGrowthChartProps {
  data: RatingGrowthDataPoint[];
  isLoading?: boolean;
}

const chartConfig = {
  rating: {
    label: "Rating",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function RatingGrowthChart({ data, isLoading }: RatingGrowthChartProps) {
  const chartData = data.map((point) => ({
    date: new Date(point.date).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
    }),
    rating: point.rating,
    ratingDelta: point.ratingDelta,
  }));

  return (
    <StatCard
      title="Wzrost ratingu w czasie"
      description="Historia zmian ratingu w Otchłani"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Brak danych o walkach w Otchłani"
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
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value) => `Data: ${value}`}
                      formatter={(value, _name, props) => {
                        const ratingDelta =
                          (props.payload?.ratingDelta as number) ?? 0;
                        const sign = ratingDelta >= 0 ? "+" : "";
                        return [`Rating: ${value} (${sign}${ratingDelta})`, ""];
                      }}
                    />
                  }
                />
                <Line
                  dataKey="rating"
                  type="monotone"
                  stroke="var(--color-rating)"
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
