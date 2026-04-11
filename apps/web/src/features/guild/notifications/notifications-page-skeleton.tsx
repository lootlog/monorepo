import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NotificationsPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <div className="flex flex-col gap-3 px-3 py-3">
        <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
              <Skeleton className="mb-3 h-5 w-32" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            </Card>
            <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
              <Skeleton className="mb-3 h-5 w-24" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
              <Skeleton className="mb-3 h-5 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-10 rounded-md" />
                <Skeleton className="h-10 rounded-md" />
              </div>
            </Card>
            <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
              <Skeleton className="mb-3 h-5 w-32" />
              <Skeleton className="h-8 rounded-md" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
