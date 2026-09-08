import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const RolesSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background px-3 pb-3 gap-3">
      <SectionCard>
        <SectionCardContent className="flex flex-col gap-0 p-0">
          <div className="border-b border-border/70 bg-background/30 p-2">
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none border-b" />
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
  );
};
