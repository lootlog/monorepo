import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const PublicBattleSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-12 items-center gap-4 border-b border-border px-4"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </Card>
    </div>
  );
};
