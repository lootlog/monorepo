import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

const detailRows = Array.from({ length: 4 });
const sections = Array.from({ length: 4 });

export const MemberSettingsDetailSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-background px-3">
      <Card className="shrink-0 border-b border-t border-border px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
            <Skeleton className="h-9 w-40 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </Card>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="min-h-full space-y-3 pb-3">
          <Card className="gap-0 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-3 w-full max-w-md" />
          </Card>

          {sections.map((_, sectionIndex) => (
            <Card key={sectionIndex} className="gap-0 px-4 py-4">
              <section>
                <Skeleton className="mb-3 h-3 w-36" />
                <div className="divide-y divide-border/60">
                  {detailRows.map((__, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="grid grid-cols-[minmax(8rem,0.75fr)_minmax(0,1fr)] gap-3 py-2"
                    >
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-full max-w-xs" />
                    </div>
                  ))}
                </div>
              </section>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
