import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const TimersPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <div className="flex flex-col gap-4 px-3 py-3">
        <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </Card>

        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};
