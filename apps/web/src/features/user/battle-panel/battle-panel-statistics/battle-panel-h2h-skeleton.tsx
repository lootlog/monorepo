import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Swords } from "lucide-react";

const noop = () => undefined;

// Stands in for the head-to-head pages: a page header above a `ResultsSurface`
// whose header carries the filter toolbar. The titles differ per route, so
// they stay placeholders; the toolbar mirrors `HeadToHeadFilterToolbar`.
export const BattlePanelH2hSkeleton = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-0">
        <PageHeader
          icon={Swords}
          title=<SkeletonLine className="h-5 w-56 max-w-full" />
          description=<SkeletonLine className="h-3 w-72 max-w-full" />
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <SectionCard className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card p-0">
          <SectionCardHeader
            className="shrink-0"
            title=<SkeletonLine className="h-4 w-40" />
            actions={
              <>
                <div className="flex min-w-0 items-center gap-2 md:hidden">
                  <Skeleton className="h-10 w-[200px] rounded-md" />
                  <Skeleton className="h-10 w-[84px] shrink-0 rounded-md" />
                </div>
                <div className="hidden min-w-0 flex-wrap items-center gap-2 md:flex">
                  <Skeleton className="h-10 min-w-[260px] flex-1 rounded-md xl:max-w-[360px]" />
                  <Skeleton className="h-10 w-[190px] rounded-md" />
                  <Skeleton className="h-10 w-[170px] rounded-md" />
                  <Skeleton className="h-10 w-24 rounded-md" />
                </div>
              </>
            }
          />
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <TableRowsSkeleton withHeader rowContent="text" />
          </div>
          <TablePaginationFooter
            totalLabel=<Skeleton className="h-4 w-36" />
            hasPrev={false}
            hasNext={false}
            onPreviousPage={noop}
            onNextPage={noop}
          />
        </SectionCard>
      </div>
    </div>
  );
};
