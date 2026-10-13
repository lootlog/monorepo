import { lazy, Suspense, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ChartCard } from "@/components/common/chart-card";

const Content = lazy(() =>
  import("./ph-growth-chart-content").then((module) => ({
    default: module.PhGrowthChart,
  })),
);

export function PhGrowthChart(props: ComponentProps<typeof Content>) {
  const { t } = useTranslation();

  return (
    // The card the chart renders, loading, so its header is there already.
    <Suspense
      fallback={
        <ChartCard
          title={t("battlePanel.statistics.phGrowth.title")}
          description={t("battlePanel.statistics.phGrowth.description")}
          isLoading
        >
          {null}
        </ChartCard>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
