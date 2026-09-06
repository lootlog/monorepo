import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { StatsTableSkeleton } from "./components/stats-table-skeleton";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const MemberDetailPageSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex flex-col gap-4 px-3 py-3">
        <SectionCard>
          <SectionCardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 flex-1" />
            </div>
          </SectionCardContent>
        </SectionCard>
      </div>

      <div className="flex-1 px-3 pb-3">
        <StatsTableSkeleton columns={5} rows={8} />
      </div>
    </div>
  );
};
