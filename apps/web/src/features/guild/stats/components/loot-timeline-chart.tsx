import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";

import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@lootlog/ui/components/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { useTranslation } from "react-i18next";
import type { LootStatsResponseDtoOutputTimelineItem } from "@lootlog/client/main";
import type { LootsControllerGetLootStatsPeriod } from "@lootlog/client/main";

const RARITY_COLORS: Record<"LEGENDARY" | "HEROIC", string> = {
  LEGENDARY: "#ef4444",
  HEROIC: "#3b82f6",
};

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

type LootTimelineChartProps = {
  data?: LootStatsResponseDtoOutputTimelineItem[];
  period?: LootsControllerGetLootStatsPeriod;
  isLoading?: boolean;
};

export const LootTimelineChart: React.FC<LootTimelineChartProps> = ({
  data,
  period = "7d",
  isLoading,
}) => {
  const { t } = useTranslation();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === "24h" || period === "3d") {
      return date.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (period === "7d" || period === "14d" || period === "30d") {
      return date.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
      });
    }
    return date.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const chartData =
    data?.map((point) => ({
      date: formatDate(point.date),
      fullDate: point.date,
      LEGENDARY: point.byRarity.LEGENDARY ?? 0,
      HEROIC: point.byRarity.HEROIC ?? 0,
      total: point.total,
    })) ?? [];

  if (isLoading) {
    return (
      <SectionCard>
        <SectionCardHeader title={t("loots.stats.timeline.title")} />
        <SectionCardContent className="flex flex-col gap-3">
          <Skeleton className="h-[250px] w-full" />
        </SectionCardContent>
      </SectionCard>
    );
  }

  if (!data?.length) {
    return (
      <SectionCard>
        <SectionCardHeader title={t("loots.stats.timeline.title")} />
        <SectionCardContent className="flex flex-col gap-3">
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            {t("loots.stats.timeline.noData")}
          </div>
        </SectionCardContent>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionCardHeader title={t("loots.stats.timeline.title")} />
      <SectionCardContent className="flex flex-col gap-3">
        <div>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                width={35}
              />
              <ChartTooltip
                content=<ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const item = payload[0]?.payload as
                      | Record<string, unknown>
                      | undefined;
                    const fullDate = item?.fullDate;
                    if (typeof fullDate !== "string") return "";
                    const date = new Date(fullDate);
                    return date.toLocaleDateString("pl-PL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  }}
                />
              />
              <Area
                type="monotone"
                dataKey="LEGENDARY"
                stackId="1"
                stroke={RARITY_COLORS.LEGENDARY}
                fill={RARITY_COLORS.LEGENDARY}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="HEROIC"
                stackId="1"
                stroke={RARITY_COLORS.HEROIC}
                fill={RARITY_COLORS.HEROIC}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </SectionCardContent>
    </SectionCard>
  );
};
