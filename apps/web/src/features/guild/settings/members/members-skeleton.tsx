import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

const tableRows = Array.from({ length: 10 });
const filterButtons = Array.from({ length: 5 });

export const MembersSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-background px-3 pb-3">
      <SectionCard className="min-h-0 flex-1 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 border-b border-border/70 bg-background/30 p-2 xl:flex-row xl:items-center xl:justify-between">
          <Skeleton className="h-9 w-full rounded-md xl:max-w-md 2xl:max-w-xl" />
          <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
            {filterButtons.map((_, index) => (
              <Skeleton
                key={index}
                className="h-9 w-20 rounded-md first:w-16"
              />
            ))}
          </div>
          <Skeleton className="h-9 w-40 shrink-0" />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="min-w-[994px] border-b border-border">
            <div className="grid h-10 grid-cols-[360px_130px_160px_150px_130px_64px] items-center border-b border-border bg-sidebar/95 px-4 text-sm">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-14" />
              <Skeleton className="ml-auto h-4 w-8" />
            </div>

            <div>
              {tableRows.map((_, index) => (
                <div
                  key={index}
                  className="grid h-16 grid-cols-[360px_130px_160px_150px_130px_64px] items-center border-b border-border/70 px-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <div className="flex items-center gap-1">
                        <Skeleton className="size-7 rounded-md" />
                        <Skeleton className="size-7 rounded-md" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                  <div className="flex justify-end gap-3">
                    <Skeleton className="h-3 w-8" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="ml-auto size-8 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-border/70 px-3 py-2">
          <Skeleton className="h-8 w-72 max-w-full" />
        </div>
      </SectionCard>
    </div>
  );
};
