import { lazy, Suspense, type ComponentProps } from "react";
import { Skeleton } from "@lootlog/ui/components/skeleton";

const Content = lazy(() =>
  import("./kill-analytics-trend-content").then((module) => ({
    default: module.KillAnalyticsTrend,
  })),
);

export function KillAnalyticsTrend(props: ComponentProps<typeof Content>) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Content {...props} />
    </Suspense>
  );
}
