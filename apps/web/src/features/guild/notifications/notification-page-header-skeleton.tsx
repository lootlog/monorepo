import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NotificationPageHeaderSkeleton = () => (
  <SectionCard>
    <SectionCardContent className="flex flex-col gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    </SectionCardContent>
  </SectionCard>
);
