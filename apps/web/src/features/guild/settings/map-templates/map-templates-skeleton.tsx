import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";
import { MapTemplateRowsSkeleton } from "./map-template-rows-skeleton";

export const MapTemplatesSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-3 pb-3">
      <SectionCard>
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="ml-7 h-3 w-48" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <SectionCardContent className="p-0">
          <MapTemplateRowsSkeleton />
        </SectionCardContent>
      </SectionCard>
    </div>
  );
};
