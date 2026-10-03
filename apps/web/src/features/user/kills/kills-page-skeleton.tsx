import { FilterBar } from "@/components/common/filter-bar";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { SectionCard } from "@/components/common/section-card/section-card";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const KillsPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <PageHeaderSkeleton />
      <FilterBar>
        <Skeleton className="h-10 min-w-0 flex-1 rounded-xl md:w-[220px] md:flex-none" />
        <Skeleton className="size-10 rounded-xl md:hidden" />
        <Skeleton className="hidden h-10 w-[200px] rounded-xl md:block" />
        <Skeleton className="hidden h-10 w-[200px] rounded-xl md:block" />
        <Skeleton className="hidden h-10 w-[200px] rounded-xl md:block" />
        <Skeleton className="hidden h-10 w-[167px] rounded-xl md:block" />
      </FilterBar>
      <SectionCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <TableRowsSkeleton trailingColumns={2} withHeader />
        </div>
        <div className="flex h-14 shrink-0 items-center justify-between border-t border-border px-4">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
