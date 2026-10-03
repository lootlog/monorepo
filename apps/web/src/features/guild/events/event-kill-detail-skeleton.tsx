import { SkeletonPageHeader } from "./components/skeleton-page-header";
import { SkeletonSectionCard } from "./components/skeleton-section-card";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventKillDetailSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
    <SkeletonPageHeader />
    <div className="grid min-w-0 items-start gap-3 2xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <SkeletonSectionCard>
          <TableRowsSkeleton rows={4} withHeader />
        </SkeletonSectionCard>
        <SkeletonSectionCard>
          <TableRowsSkeleton rows={4} withHeader />
        </SkeletonSectionCard>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <SkeletonSectionCard>
          <TableRowsSkeleton rows={3} withHeader />
        </SkeletonSectionCard>
      </div>
    </div>
  </div>
);
