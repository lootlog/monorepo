import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const RoleSettingsDetailSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-background px-3">
      <Card className="shrink-0 border-b border-t border-border px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="flex min-h-8 shrink-0 items-center gap-1 pl-12 sm:pl-0">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
      </Card>
      <Card className="border-border bg-card p-0">
        <div className="p-3">
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-80 max-w-full" />
            </div>
          </div>
          <div className="ml-11 flex items-center gap-3">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </Card>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="overflow-hidden border-border bg-card p-0"
          >
            <Skeleton className="h-16 w-full rounded-none" />
          </Card>
        ))}
      </div>
    </div>
  );
};
