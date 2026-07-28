import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const EventCoordinationSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <Card className="gap-4 border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
