import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const ReservationsSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="w-full space-y-4 px-3 pb-3">
          <Card className="gap-0 overflow-hidden border-border bg-card p-0">
            {Array.from({ length: 3 }).map((_, sectionIndex) => (
              <div
                key={sectionIndex}
                className="space-y-4 border-b border-border p-4 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-64 max-w-full" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: sectionIndex === 2 ? 1 : 2 }).map(
                    (_, fieldIndex) => (
                      <div key={fieldIndex} className="space-y-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-3 w-48 max-w-full" />
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))}
          </Card>
          <Card className="space-y-4 border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
};
