import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventKillsSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
    <SkeletonFilterBar />
    <SectionCardSkeleton withIcon withDescription={false}>
      <TableRowsSkeleton rows={7} trailingColumns={3} withHeader />
    </SectionCardSkeleton>
  </div>
);
