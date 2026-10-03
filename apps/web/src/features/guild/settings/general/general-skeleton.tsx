import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";

import { Skeleton } from "@lootlog/ui/components/skeleton";

export const GeneralSettingsSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-3 pb-3">
      <SectionCard>
        <SectionCardHeader
          title=<Skeleton render={<span />} className="block h-5 w-32" />
          description=<Skeleton
            render={<span />}
            className="block h-3 w-72 max-w-full"
          />
        />
        <SectionCardContent className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full max-w-xs" />
          <Skeleton className="h-3 w-56" />
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader
          title=<Skeleton render={<span />} className="block h-5 w-48" />
          description=<Skeleton
            render={<span />}
            className="block h-3 w-80 max-w-full"
          />
          actions=<Skeleton className="h-6 w-11 rounded-full" />
        />
        <SectionCardContent className="space-y-3">
          <Skeleton className="h-3 w-64 max-w-full" />
          <Skeleton className="aspect-[1200/630] w-full max-w-xl" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
  );
};
