import { lazy, Suspense, type ComponentProps } from "react";
import { Skeleton } from "@lootlog/ui/components/skeleton";

const Content = lazy(() =>
  import("./rating-growth-chart-content").then((module) => ({
    default: module.RatingGrowthChart,
  })),
);

export function RatingGrowthChart(props: ComponentProps<typeof Content>) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Content {...props} />
    </Suspense>
  );
}
