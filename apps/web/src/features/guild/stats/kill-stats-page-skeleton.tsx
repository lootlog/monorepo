import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const KillStatsPageSkeleton = () => {
  return (
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
          <div className="grid grid-cols-2 gap-2 min-[1280px]:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 min-[1280px]:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SectionCard key={i}>
            <SectionCardHeader title={<Skeleton className="mb-2 h-3 w-16" />} />
            <SectionCardContent className="flex flex-col gap-3">
              <Skeleton className="h-7 w-20" />
            </SectionCardContent>
          </SectionCard>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
        <SectionCard>
          <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-32" />} />
          <SectionCardContent className="flex flex-col gap-3">
            <div className="flex items-end justify-center gap-4">
              <Skeleton className="h-20 w-16 rounded-lg" />
              <Skeleton className="h-28 w-16 rounded-lg" />
              <Skeleton className="h-16 w-16 rounded-lg" />
            </div>
          </SectionCardContent>
        </SectionCard>
        <SectionCard>
          <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-32" />} />
          <SectionCardContent className="flex flex-col gap-3">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          </SectionCardContent>
        </SectionCard>
      </div>
    </div>
  );
};
