import { SkeletonFilterBar } from "./components/skeleton-filter-bar";
import { PageHeaderSkeleton } from "@/components/common/page-header-skeleton";
import { SectionCardSkeleton } from "@/components/common/section-card/section-card-skeleton";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventRankingSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
    <PageHeaderSkeleton withMetadata />
    <SkeletonFilterBar />
    <SectionCardSkeleton withIcon withDescription={false}>
      <TableRowsSkeleton rows={8} withHeader />
    </SectionCardSkeleton>
  </div>
);
