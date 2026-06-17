import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NpcSettingsDetailSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-background/50 px-3">
      <Card className="shrink-0 border-b border-t border-border px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex min-h-8 shrink-0 items-center gap-1 pl-12 sm:pl-0">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden border-border bg-card/50 p-0 backdrop-blur-sm gap-0">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </div>
        </div>
        <div className="divide-y divide-border/50 border-t border-border/50">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-none" />
          ))}
        </div>
      </Card>
    </div>
  );
};
