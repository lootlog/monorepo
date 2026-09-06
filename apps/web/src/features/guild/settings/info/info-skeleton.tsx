import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const InfoSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex flex-col gap-4 px-3 py-3">
        <SectionCard>
          <SectionCardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </SectionCardContent>
        </SectionCard>

        <SectionCard>
          <SectionCardContent className="flex flex-col gap-3">
            <div className="grid gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </SectionCardContent>
        </SectionCard>

        <SectionCard>
          <SectionCardHeader title={<Skeleton className="mb-3 h-5 w-32" />} />
          <SectionCardContent className="flex flex-col gap-3">
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-md" />
              ))}
            </div>
          </SectionCardContent>
        </SectionCard>
      </div>
    </div>
  );
};
