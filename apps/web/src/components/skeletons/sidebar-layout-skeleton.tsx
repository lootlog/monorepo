import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const SidebarLayoutSkeleton = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="px-3 pb-0 pt-3">
        <Card className="gap-3 border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </Card>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="hidden w-[320px] border-l border-border p-3 md:block">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
