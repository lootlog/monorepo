import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NotificationSettingsSkeleton = ({
  showActions = true,
}: {
  showActions?: boolean;
}) => (
  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
    <div className="space-y-4 lg:col-span-2">
      <SectionCard>
        <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-32" />} />
        <SectionCardContent className="flex flex-col gap-3">
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-24" />} />
        <SectionCardContent className="flex flex-col gap-3">
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
    <div className="space-y-4">
      <SectionCard>
        <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-24" />} />
        <SectionCardContent className="flex flex-col gap-3">
          <div className="space-y-2">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>
        </SectionCardContent>
      </SectionCard>
      {showActions && (
        <SectionCard>
          <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-32" />} />
          <SectionCardContent className="flex flex-col gap-3">
            <Skeleton className="h-8 rounded-md" />
          </SectionCardContent>
        </SectionCard>
      )}
    </div>
  </div>
);
