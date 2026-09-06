import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { StatsTableSkeleton } from "./components/stats-table-skeleton";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const RankingPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex flex-col gap-4 px-3 py-3">
        <SectionCard>
          <SectionCardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-8 w-24" />
            </div>
          </SectionCardContent>
        </SectionCard>
      </div>

      <div className="flex-1 px-3 pb-3">
        <StatsTableSkeleton columns={6} rows={10} footer />
      </div>
    </div>
  );
};
