import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

const chartTicks = Array.from({ length: 9 });

export function BattleHpTimelineChartSkeleton() {
  return (
    <SectionCard aria-hidden="true">
      <SectionCardHeader
        title={<Skeleton className="h-4 w-36" />}
        actions={<Skeleton className="h-8 w-24" />}
      />

      <div className="relative m-3 h-36 w-full overflow-hidden rounded-md bg-background/35 px-4 py-4">
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
    </SectionCard>
  );
}
