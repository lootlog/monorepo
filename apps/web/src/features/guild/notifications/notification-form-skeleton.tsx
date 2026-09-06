import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NotificationFormSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div className="lg:col-span-2">
      <SectionCard>
        <SectionCardContent className="flex flex-col gap-3">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
    <div className="hidden lg:block">
      <SectionCard>
        <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-24" />} />
        <SectionCardContent className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full rounded-lg" />
        </SectionCardContent>
      </SectionCard>
    </div>
  </div>
);
