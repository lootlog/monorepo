import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const DashboardPageSkeleton = () => {
  return (
    <div className="@container/dashboard px-3 py-3">
      <div className="grid items-start gap-4 @5xl/dashboard:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="@container/statistics flex min-w-0 flex-col gap-3">
          <div className="flex min-h-12 flex-col gap-2 border-b border-border/70 pb-3 @2xl/statistics:flex-row @2xl/statistics:items-center @2xl/statistics:justify-between">
            <Skeleton className="h-4 w-40" />
            <div className="grid w-full grid-cols-2 gap-2 @2xl/statistics:w-auto @2xl/statistics:min-w-[21rem] @2xl/statistics:border-l @2xl/statistics:pl-4">
              <Skeleton className="h-11 w-full @2xl/statistics:h-9" />
              <Skeleton className="h-11 w-full @2xl/statistics:h-9" />
            </div>
          </div>

          <div className="@container/overview flex min-w-0 flex-col gap-3">
            <Card className="gap-0 py-0">
              <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
              <div className="grid @xl/overview:grid-cols-2">
                {Array.from({ length: 2 }).map((_, sectionIndex) => (
                  <div
                    key={sectionIndex}
                    className="border-b border-border/70 px-3 py-3 last:border-b-0 @xl/overview:border-b-0 @xl/overview:first:border-r"
                  >
                    <Skeleton className="h-3 w-28" />
                    <div className="mt-1 space-y-1">
                      {Array.from({ length: 5 }).map((__, rowIndex) => (
                        <Skeleton key={rowIndex} className="h-9 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="@container/top-npcs gap-0 py-0">
              <div className="flex min-h-12 flex-col gap-2 border-b border-border/70 px-3 py-2 @md/top-npcs:flex-row @md/top-npcs:items-center @md/top-npcs:justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-11 w-full @md/top-npcs:h-9 @md/top-npcs:w-28" />
              </div>
              <div className="divide-y border-b border-border/70">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex min-h-12 items-center gap-2.5 px-3 py-2"
                  >
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="size-8 rounded-md" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-12" />
                  </div>
                ))}
              </div>
              <div className="flex min-h-10 justify-center px-3 py-1">
                <Skeleton className="h-9 w-40" />
              </div>
            </Card>
          </div>
        </div>

        <div className="min-w-0">
          <Card className="gap-0 py-0">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="divide-y divide-border/70">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="space-y-2 px-3 py-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
