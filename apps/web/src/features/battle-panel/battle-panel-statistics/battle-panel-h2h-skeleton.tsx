import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const BattlePanelH2hSkeleton = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background/50">
      <div className="px-3 pb-0 pt-3">
        <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </Card>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm">
            <div className="flex gap-4 border-b border-border px-4 py-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex h-14 items-center gap-4 border-b border-border px-4"
              >
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </Card>
        </div>
        <div className="hidden w-[320px] border-l border-border p-3 md:block">
          <Card className="h-full border-border bg-card/40 p-4 backdrop-blur-sm">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
