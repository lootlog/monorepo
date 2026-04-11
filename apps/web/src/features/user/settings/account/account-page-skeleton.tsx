import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const AccountSettingsPageSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </Card>

      <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </Card>

      <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </Card>
    </div>
  );
};
