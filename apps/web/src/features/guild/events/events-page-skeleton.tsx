import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const EventsPageSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <Card className="gap-4 border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
