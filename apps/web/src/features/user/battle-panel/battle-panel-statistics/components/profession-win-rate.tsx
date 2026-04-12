import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { getProfessionName, getProfessionColor } from "@/lib/utils/professions";
import { StatCard } from "./stat-card";

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

const chartConfig = {
  winRate: {
    label: "Współczynnik wygranych %",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ProfessionWinRateChart({
  data,
  isLoading,
}: ProfessionWinRateChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    professionName: getProfessionName(item.prof),
  }));

  return (
    <StatCard
      title="Współczynnik wygranych vs profesja"
      description="Twój procent wygranych przeciwko każdej profesji w walkach 1v1"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Brak danych o walkach"
    >
      <div>
        <div className="bg-muted/30 rounded-lg p-4">
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
                    return `${value} (${item?.totalBattles ?? 0} walk)`;
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
        </div>
      </div>
    </StatCard>
  );
}
