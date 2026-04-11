import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const MemberDetailPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <div className="flex flex-col gap-4 px-3 py-3">
        <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 flex-1" />
          </div>
        </Card>
      </div>

      <div className="flex-1 px-3 pb-3">
        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm">
          <div className="flex gap-4 border-b border-border px-4 py-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex h-14 items-center gap-4 border-b border-border px-4"
            >
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};
