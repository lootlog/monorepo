import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Activity } from "lucide-react";

const chartTicks = Array.from({ length: 9 });

export function BattleHpTimelineChartSkeleton() {
  return (
    <Card className="gap-2 border-border bg-card p-3" aria-hidden="true">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary/45" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-sm" />
          <Skeleton className="h-8 w-8 rounded-sm" />
          <Skeleton className="h-8 w-24 rounded-sm" />
        </div>
      </div>

      <div className="relative h-36 w-full overflow-hidden rounded-md bg-background/35 px-4 py-4">
        <div className="absolute inset-x-4 top-1/4 h-px bg-border/45" />
        <div className="absolute inset-x-4 top-1/2 h-px bg-border/65" />
        <div className="absolute inset-x-4 top-3/4 h-px bg-border/45" />
        <div className="flex h-full items-end justify-between gap-2">
          {chartTicks.map((_, index) => (
            <div
              key={index}
              className="flex h-full flex-1 flex-col justify-end gap-2"
            >
              <Skeleton
                className="w-full rounded-sm"
                style={{ height: `${32 + ((index * 17) % 72)}px` }}
              />
              <Skeleton className="mx-auto h-1.5 w-6" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
