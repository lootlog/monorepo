import { Skeleton } from "@lootlog/ui/components/skeleton";
import { lazy, Suspense, type ComponentProps } from "react";

const Content = lazy(() =>
  import("./statistics-play-time-chart-content").then((module) => ({
    default: module.StatisticsPlayTimeChart,
  })),
);

export function StatisticsPlayTimeChart(props: ComponentProps<typeof Content>) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
      <Content {...props} />
    </Suspense>
  );
}
