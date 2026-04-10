import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const HomePageSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
        <Skeleton className="h-9 w-48" />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
          <Skeleton className="mb-3 h-5 w-32" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
        </Card>
        <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
