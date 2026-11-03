import { useTranslation } from "react-i18next";
import { ChartSection } from "@/components/common/chart-section";

/** `LootTimelineChart` while its chart code or data loads. */
export const LootTimelineChartSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ChartSection
      title={t("loots.stats.timeline.title")}
      description={t("loots.stats.timeline.description")}
      isLoading
    >
      {null}
    </ChartSection>
  );
};
