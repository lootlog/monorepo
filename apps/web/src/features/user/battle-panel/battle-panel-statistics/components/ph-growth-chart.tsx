import { useTranslation } from "react-i18next";
import { BATTLE_HEX_COLORS } from "@/components/battle/utils/battle-color-palette";
import { GrowthChartCard } from "./growth-chart-card";

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
  const chartData = data.map((point) => ({
    date: new Date(point.date).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
    }),
    cumulativePh: point.cumulativePh,
    ph: point.ph,
  }));

  return (
    <GrowthChartCard
      chartData={chartData}
      color={BATTLE_HEX_COLORS.chart.honorPoints}
      dataKey="cumulativePh"
      description={t("battlePanel.statistics.phGrowth.description")}
      emptyMessage={t("battlePanel.statistics.phGrowth.empty")}
      isLoading={isLoading}
      label={t("battlePanel.statistics.phGrowth.chartLabel")}
      title={t("battlePanel.statistics.phGrowth.title")}
      tooltipDate={(date) =>
        t("battlePanel.statistics.phGrowth.tooltipDate", { date })
      }
      tooltipValue={(value, payload) =>
        t("battlePanel.statistics.phGrowth.tooltipValue", {
          value,
          ph: typeof payload.ph === "number" ? payload.ph : 0,
        })
      }
    />
  );
}
