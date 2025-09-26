import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@lootlog/ui/components/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";

export const description = "An area chart with a legend";

const chartData = [
  { month: "Styczeń", battles: 186, winrate: 80 },
  { month: "Luty", battles: 305, winrate: 200 },
  { month: "Marzec", battles: 237, winrate: 120 },
  { month: "Kwiecień", battles: 73, winrate: 190 },
  { month: "Maj", battles: 209, winrate: 130 },
  { month: "Czerwiec", battles: 214, winrate: 140 },
];

const chartConfig = {
  battles: {
    label: "Walki",
    color: "var(--chart-1)",
  },
  winrate: {
    label: "Winrate",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function BattlesChart() {
  return (
    <div className="p-4">
      <div>
        <h2 className="text-lg font-semibold">Walki</h2>
        <p className="text-sm text-muted-foreground">
          Pokazuje statystyki walk dla danej postaci z ostatnich 6 miesięcy
        </p>
      </div>
      <div className="pt-4">
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: -24,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="battles"
              type="natural"
              fill="var(--color-battles)"
              fillOpacity={0.4}
              stroke="var(--color-battles)"
              stackId="a"
            />
            <Area
              dataKey="winrate"
              type="natural"
              fill="var(--color-winrate)"
              fillOpacity={0.4}
              stroke="var(--color-winrate)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
