import { useTranslation } from "react-i18next";
import { ChartSection } from "@/components/common/chart-section";

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
