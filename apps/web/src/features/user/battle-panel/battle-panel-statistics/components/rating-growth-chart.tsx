import { lazy, Suspense, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ChartSection } from "@/components/common/chart-section";

const Content = lazy(() =>
  import("./rating-growth-chart-content").then((module) => ({
    default: module.RatingGrowthChart,
  })),
);

export function RatingGrowthChart(props: ComponentProps<typeof Content>) {
  const { t } = useTranslation();

  return (
    // The section the chart renders, loading, so its heading is there already.
    <Suspense
      fallback={
        <ChartSection
          title={t("battlePanel.statistics.ratingGrowth.title")}
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
