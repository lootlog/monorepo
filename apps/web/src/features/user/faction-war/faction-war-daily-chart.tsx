import { Skeleton } from "@lootlog/ui/components/skeleton";
import { lazy, Suspense, type ComponentProps } from "react";

const Content = lazy(() =>
  import("./faction-war-daily-chart-content").then((module) => ({
    default: module.FactionWarDailyChart,
  })),
);

export function FactionWarDailyChart(props: ComponentProps<typeof Content>) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
      <Content {...props} />
    </Suspense>
  );
}
