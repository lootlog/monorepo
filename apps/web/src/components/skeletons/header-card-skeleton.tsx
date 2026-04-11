import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const HeaderCardSkeleton = () => {
  return (
    <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    </Card>
  );
};
