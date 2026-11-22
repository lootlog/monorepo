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
    <Suspense fallback={<Skeleton className={cn("w-full", props.className)} />}>
      <Content {...props} />
    </Suspense>
  );
}
