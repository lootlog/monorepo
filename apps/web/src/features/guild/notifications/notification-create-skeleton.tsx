import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { NotificationFormSkeleton } from "./notification-form-skeleton";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const NotificationCreateSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex flex-col gap-3 px-3 py-3">
        <SectionCard>
          <SectionCardContent className="flex flex-col gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </SectionCardContent>
        </SectionCard>

        <NotificationFormSkeleton />
      </div>
    </div>
  );
};
