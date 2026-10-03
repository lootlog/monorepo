import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SkeletonPageHeader } from "./components/skeleton-page-header";
import { SkeletonSectionCard } from "./components/skeleton-section-card";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventDetailSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
    <SkeletonPageHeader>
      <SectionCardFooter className="grid gap-1 p-1.5 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full rounded-md" />
        ))}
      </SectionCardFooter>
    </SkeletonPageHeader>

    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
      <div className="min-w-0 space-y-3">
        <SkeletonSectionCard>
          <TableRowsSkeleton rows={4} withHeader />
        </SkeletonSectionCard>
        <SkeletonSectionCard>
          <Skeleton className="m-3 h-40 rounded-lg" />
        </SkeletonSectionCard>
      </div>
      <div className="min-w-0 space-y-3">
        <SkeletonSectionCard>
          <TableRowsSkeleton rows={5} withHeader />
        </SkeletonSectionCard>
        <SkeletonSectionCard>
          <TableRowsSkeleton rows={5} withHeader />
        </SkeletonSectionCard>
      </div>
    </div>
  </div>
);
