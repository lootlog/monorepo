import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NpcSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background px-3 gap-3">
      <SectionCard className="shrink-0">
        <SectionCardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardContent className="flex flex-col gap-3">
          <div className="border-b border-border px-4 py-3">
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none border-b" />
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
  );
};
