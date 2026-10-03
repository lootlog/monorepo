import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SkeletonPageHeader } from "./components/skeleton-page-header";
import { SkeletonSectionCard } from "./components/skeleton-section-card";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventHeroSkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3 px-3 py-3">
    <SkeletonPageHeader />

    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <SkeletonSectionCard>
          <div className="divide-y divide-border/70">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-none" />
            ))}
          </div>
        </SkeletonSectionCard>
      </div>
      <div className="space-y-3">
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
