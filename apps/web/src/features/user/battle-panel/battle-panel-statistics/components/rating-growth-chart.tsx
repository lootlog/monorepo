import { useTranslation } from "react-i18next";
import { BATTLE_HEX_COLORS } from "@/components/battle/utils/battle-color-palette";
import { GrowthChartCard } from "./growth-chart-card";

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

export function RatingGrowthChart({ data, isLoading }: RatingGrowthChartProps) {
  const { t } = useTranslation();
  const chartData = data.map((point) => ({
    date: new Date(point.date).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
    }),
    rating: point.rating,
    ratingDelta: point.ratingDelta,
  }));

  return (
    <GrowthChartCard
      chartData={chartData}
      color={BATTLE_HEX_COLORS.chart.rating}
      dataKey="rating"
      description={t("battlePanel.statistics.ratingGrowth.description")}
      emptyMessage={t("battlePanel.statistics.ratingGrowth.empty")}
      isLoading={isLoading}
      label={t("battlePanel.statistics.ratingGrowth.chartLabel")}
      title={t("battlePanel.statistics.ratingGrowth.title")}
      tooltipDate={(date) =>
        t("battlePanel.statistics.ratingGrowth.tooltipDate", { date })
      }
      tooltipValue={(value, payload) => {
        const ratingDelta =
          typeof payload.ratingDelta === "number" ? payload.ratingDelta : 0;

        return t("battlePanel.statistics.ratingGrowth.tooltipValue", {
          value,
          delta: `${ratingDelta >= 0 ? "+" : ""}${ratingDelta}`,
        });
      }}
    />
  );
}
