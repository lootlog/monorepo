import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { PageHeader } from "@/components/common/page-header";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const BattlePanelH2hSkeleton = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="px-3 pt-3 pb-0">
        <PageHeader
          title={<Skeleton className="h-5 w-40" />}
          description={<Skeleton className="h-3 w-48" />}
        ></PageHeader>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
          <SectionCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
            <SectionCardContent className="flex min-h-0 flex-1 flex-col p-0">
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
              <SectionCardFooter className="shrink-0 justify-between">
                <Skeleton className="h-4 w-28" />
                <div className="flex gap-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-24 rounded-md" />
                  ))}
                </div>
              </SectionCardFooter>
            </SectionCardContent>
          </SectionCard>
        </div>

        <div className="hidden h-full w-[320px] shrink-0 flex-col overflow-hidden bg-background py-3 pr-3 md:flex">
          <SectionCard className="flex min-h-0 flex-1 flex-col gap-0 border-border bg-filters-sidebar p-0">
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
          </SectionCard>
        </div>
      </div>

      <Skeleton className="fixed bottom-4 right-4 z-20 size-14 rounded-full shadow-lg md:hidden" />
    </div>
  );
};
