import { lazy, Suspense, type ComponentProps } from "react";
import { KillAnalyticsTrendSkeleton } from "./kill-analytics-trend-skeleton";

const Content = lazy(() =>
  import("./kill-analytics-trend-content").then((module) => ({
    default: module.KillAnalyticsTrend,
  })),
);

export function KillAnalyticsTrend(props: ComponentProps<typeof Content>) {
  return (
    <Suspense
      fallback={
        <KillAnalyticsTrendSkeleton
          title={props.title}
          description={props.description}
        />
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
