import { FilterBar } from "@/components/common/filter-bar";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const KillsPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <PageHeader
        title=<Skeleton render={<span />} className="block h-5 w-40" />
        description=<Skeleton render={<span />} className="block h-3 w-48" />
      />
      <FilterBar>
        <Skeleton className="h-10 w-full rounded-xl md:w-[220px]" />
        <Skeleton className="h-10 w-[140px] md:w-[200px]" />
        <Skeleton className="h-10 w-[160px]" />
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[152px]" />
      </FilterBar>
      <SectionCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <TableRowsSkeleton trailingColumns={2} />
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
