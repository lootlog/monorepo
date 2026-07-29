import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const GeneralSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Card className="mx-3 mt-3 shrink-0 gap-4 border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </Card>
      <div className="flex-1 p-3">
        <Card className="border-border bg-card p-4">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
