import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const BattlePanelH2hSkeleton = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="px-3 pt-3 pb-0">
        <Card className="gap-3 border-border bg-card p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="hidden size-9 shrink-0 rounded-md md:block" />
          </div>
        </Card>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
          <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card p-0">
            <div className="flex gap-4 border-b border-border px-4 py-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-4 flex-1" />
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {Array.from({ length: 8 }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex h-14 items-center gap-4 border-b border-border px-4"
                >
                  {Array.from({ length: 6 }).map((_, columnIndex) => (
                    <Skeleton key={columnIndex} className="h-4 flex-1" />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex h-14 shrink-0 items-center justify-between border-t border-border px-4">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-24 rounded-md" />
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="hidden h-full w-[320px] shrink-0 flex-col overflow-hidden bg-background py-3 pr-3 md:flex">
          <Card className="flex min-h-0 flex-1 flex-col gap-0 border-border bg-filters-sidebar p-0">
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  {index === 3 ? (
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 flex-1 rounded-md" />
                      <Skeleton className="size-4 rounded-sm" />
                      <Skeleton className="h-10 flex-1 rounded-md" />
                    </div>
                  ) : index === 4 ? (
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="size-4 rounded-sm" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <Skeleton className="size-4 rounded-sm" />
                    </div>
                  ) : (
                    <Skeleton className="h-10 w-full rounded-md" />
                  )}
                  {index < 4 ? <div className="h-px bg-border" /> : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Skeleton className="fixed bottom-4 right-4 z-20 size-14 rounded-full shadow-lg md:hidden" />
    </div>
  );
};
