import { Skeleton } from "@lootlog/ui/components/skeleton";
import { lazy, Suspense, type ComponentProps } from "react";

const Content = lazy(() =>
  import("./statistics-week-chart-content").then((module) => ({
    default: module.StatisticsWeekChart,
  })),
);

export function StatisticsWeekChart(props: ComponentProps<typeof Content>) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
      <Content {...props} />
    </Suspense>
  );
}
