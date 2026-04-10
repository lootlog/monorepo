import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const FilterBarSkeleton = () => {
  return (
    <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </Card>
  );
};
