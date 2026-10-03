import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { SkeletonPageHeader } from "./components/skeleton-page-header";
import { SkeletonSectionCard } from "./components/skeleton-section-card";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventRankingSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
    <SkeletonPageHeader />
    <SkeletonFilterBar />
    <SkeletonSectionCard>
      <TableRowsSkeleton rows={8} withHeader />
    </SkeletonSectionCard>
  </div>
);
