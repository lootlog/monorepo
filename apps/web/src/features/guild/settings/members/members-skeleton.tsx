import { Card } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

const tableRows = Array.from({ length: 10 });
const filterButtons = Array.from({ length: 5 });

export const MembersSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-background px-3">
      <Card className="shrink-0 px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-full max-w-sm" />
              <div className="flex flex-wrap items-center gap-1.5">
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex w-full min-w-0 items-center xl:w-auto xl:justify-end">
            <Skeleton className="h-9 w-44 rounded-md" />
          </div>
        </div>
      </Card>

      <Card className="min-h-0 flex-1 gap-0 overflow-hidden p-0">
        <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <Skeleton className="h-9 w-full rounded-md xl:max-w-md 2xl:max-w-xl" />
          <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
            {filterButtons.map((_, index) => (
              <Skeleton
                key={index}
                className="h-8 w-20 rounded-md first:w-16"
              />
            ))}
          </div>
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
      </Card>
    </div>
  );
};
