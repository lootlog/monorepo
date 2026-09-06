import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const MapTemplatesSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-4 px-3 py-3">
        <SectionCard>
          <SectionCardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </SectionCardContent>
        </SectionCard>

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SectionCard key={i}>
              <SectionCardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
              </SectionCardContent>
            </SectionCard>
          ))}
        </div>
      </div>
    </div>
  );
};
