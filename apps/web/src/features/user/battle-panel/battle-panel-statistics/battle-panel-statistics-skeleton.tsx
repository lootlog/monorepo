import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const BattlePanelStatisticsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-background/50 px-3 py-3">
      <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </Card>

      <Card className="gap-3 border-border bg-card/60 p-3 backdrop-blur-sm">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={i}
            className="border-border bg-card/40 p-4 backdrop-blur-sm"
          >
            <Skeleton className="mb-3 h-5 w-32" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card
            key={i}
            className="border-border bg-card/40 p-4 backdrop-blur-sm"
          >
            <Skeleton className="mb-3 h-5 w-32" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </Card>
        ))}
      </div>
    </div>
  );
};
