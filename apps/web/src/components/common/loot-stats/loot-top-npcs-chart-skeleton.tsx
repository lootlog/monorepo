import { useTranslation } from "react-i18next";
import { ChartSection } from "@/components/common/chart-section";

/** `LootTopNpcsChart` while its chart code or data loads. */
export const LootTopNpcsChartSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ChartSection
      title={t("loots.stats.topNpcs.title")}
      description={t("loots.stats.topNpcs.description")}
      isLoading
    >
      {null}
    </ChartSection>
  );
};
