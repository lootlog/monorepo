import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const LootStatsPageSkeleton = () => {
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
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </SectionCardContent>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SectionCard key={i}>
            <SectionCardHeader title={<Skeleton className="mb-2 h-3 w-16" />} />
            <SectionCardContent className="flex flex-col gap-3">
              <Skeleton className="h-7 w-20" />
            </SectionCardContent>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard>
          <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-32" />} />
          <SectionCardContent className="flex flex-col gap-3">
            <Skeleton className="h-48 w-full rounded-lg" />
          </SectionCardContent>
        </SectionCard>
        <SectionCard>
          <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-32" />} />
          <SectionCardContent className="flex flex-col gap-3">
            <Skeleton className="h-48 w-full rounded-lg" />
          </SectionCardContent>
        </SectionCard>
      </div>
    </div>
  );
};
