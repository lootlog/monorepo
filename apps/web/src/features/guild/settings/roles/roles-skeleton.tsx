import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const RolesSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background px-3 gap-3">
      <Card className="gap-4 border-border bg-card p-4  shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </Card>
      <Card className="p-0 gap-0">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none border-b" />
          ))}
        </div>
      </Card>
    </div>
  );
};
