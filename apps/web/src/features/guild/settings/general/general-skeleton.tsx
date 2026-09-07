import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const GeneralSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 px-3 pb-3">
        <SectionCard>
          <SectionCardContent className="flex flex-col gap-3">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </SectionCardContent>
        </SectionCard>
      </div>
    </div>
  );
};
