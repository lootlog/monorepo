import { lazy, Suspense, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ChartSection } from "@/components/common/chart-section";

const Content = lazy(() =>
  import("./ph-growth-chart-content").then((module) => ({
    default: module.PhGrowthChart,
  })),
);

export function PhGrowthChart(props: ComponentProps<typeof Content>) {
  const { t } = useTranslation();

  return (
    // The section the chart renders, loading, so its heading is there already.
    <Suspense
      fallback={
        <ChartSection
          title={t("battlePanel.statistics.phGrowth.title")}
          isLoading
        >
          {null}
        </ChartSection>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
