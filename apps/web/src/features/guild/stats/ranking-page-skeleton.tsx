import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const RankingPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex flex-col gap-4 px-3 py-3">
        <Card className="gap-4 border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-8 w-24" />
          </div>
        </Card>
      </div>

      <div className="flex-1 px-3 pb-3">
        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card p-0">
          <div className="flex gap-4 border-b border-border px-4 py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex h-14 items-center gap-4 border-b border-border px-4"
            >
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
          <div className="flex h-14 shrink-0 items-center justify-between border-t border-border px-4">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
