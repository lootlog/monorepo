import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

const tableRows = Array.from({ length: 10 });
const filterGroups = Array.from({ length: 6 });
const teamMembers = Array.from({ length: 2 });
const tagItems = Array.from({ length: 3 });

const renderTeamSkeleton = () => (
  <div className="flex min-w-0 max-w-[112px] flex-col gap-1 md:min-w-[200px] md:max-w-[300px]">
    {teamMembers.map((_, index) => (
      <div key={index} className="flex min-w-0 items-center gap-1.5">
        <Skeleton className="size-7 shrink-0 rounded-sm" />
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-3.5 w-28 max-w-full" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    ))}
  </div>
);

export const BattlePanelBattlesSkeleton = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background/50">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
          <Card className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm">
            <div className="grid shrink-0 gap-2 border-b border-border bg-background/80 px-3 py-3 md:min-h-[64px] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="h-10 min-w-0 flex-1 rounded-md md:max-w-[360px]" />
              </div>
              <div className="hidden min-h-8 items-center justify-end gap-2 md:flex">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="size-9 rounded-md" />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="min-w-full md:min-w-[840px]">
                <div className="sticky top-0 z-10 grid h-11 grid-cols-[9%_27%_27%_22%_15%] items-center border-b border-border bg-background px-2 md:grid-cols-[40px_minmax(210px,1fr)_minmax(210px,1fr)_116px_176px_112px_76px_64px] md:px-3">
                  <Skeleton className="mx-auto size-4 rounded-sm" />
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="hidden h-3.5 w-16 md:block" />
                  <Skeleton className="hidden h-3.5 w-20 md:block" />
                  <Skeleton className="h-3.5 w-14" />
                  <Skeleton className="hidden h-3.5 w-12 md:block" />
                  <Skeleton className="h-3.5 w-8 justify-self-end" />
                </div>

                {tableRows.map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid min-h-14 grid-cols-[9%_27%_27%_22%_15%] items-center border-b border-border bg-background/20 px-2 md:grid-cols-[40px_minmax(210px,1fr)_minmax(210px,1fr)_116px_176px_112px_76px_64px] md:px-3"
                  >
                    <Skeleton className="mx-auto size-4 rounded-sm" />
                    {renderTeamSkeleton()}
                    {renderTeamSkeleton()}
                    <div className="hidden md:block">
                      <Skeleton className="h-5 w-20 rounded-md" />
                    </div>
                    <div className="hidden max-w-[176px] flex-wrap gap-1 md:flex">
                      {tagItems.map((_, index) => (
                        <Skeleton
                          key={index}
                          className="h-5 w-12 rounded-full"
                        />
                      ))}
                    </div>
                    <Skeleton className="h-3.5 w-20" />
                    <div className="hidden justify-center gap-1 md:flex">
                      <Skeleton className="size-6 rounded-md" />
                      {rowIndex % 3 === 0 ? (
                        <Skeleton className="h-5 w-8 rounded-md" />
                      ) : null}
                    </div>
                    <Skeleton className="size-8 justify-self-end rounded-md" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border px-4">
              <Skeleton className="h-4 w-36" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          </Card>
        </div>

        <div className="hidden h-full w-[320px] shrink-0 flex-col overflow-hidden bg-background/50 py-3 pr-3 md:flex">
          <Card className="flex min-h-0 flex-1 flex-col gap-0 border-border bg-filters-sidebar p-0 backdrop-blur-sm">
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="space-y-4 p-4">
                {filterGroups.map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    {index === 4 ? (
                      <div className="flex items-center gap-2">
                        <Skeleton className="size-4 rounded-sm" />
                        <Skeleton className="size-4 rounded-sm" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ) : index === 5 ? (
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-10 flex-1 rounded-md" />
                        <Skeleton className="size-4 rounded-sm" />
                        <Skeleton className="h-10 flex-1 rounded-md" />
                      </div>
                    ) : (
                      <Skeleton className="h-10 w-full rounded-md" />
                    )}
                    {index < filterGroups.length - 1 ? (
                      <div className="h-px bg-border" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Skeleton className="fixed bottom-4 right-4 z-20 size-14 rounded-full shadow-lg md:hidden" />
    </div>
  );
};
