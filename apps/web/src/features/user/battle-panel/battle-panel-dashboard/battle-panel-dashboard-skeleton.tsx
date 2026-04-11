import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const BattlePanelDashboardSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="border-border bg-card/40 p-4 backdrop-blur-sm"
          >
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-7 w-20" />
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </Card>
    </div>
  );
};
