import { lazy, Suspense, type ComponentProps } from "react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

const Content = lazy(() =>
  import("./battle-hp-timeline-plot-content").then((module) => ({
    default: module.BattleHpTimelinePlot,
  })),
);

export function BattleHpTimelinePlot(props: ComponentProps<typeof Content>) {
  return (
    // Sized by the caller's class, like the plot it stands in for.
    <Suspense fallback={<Skeleton className={cn("w-full", props.className)} />}>
      <Content {...props} />
    </Suspense>
  );
}
