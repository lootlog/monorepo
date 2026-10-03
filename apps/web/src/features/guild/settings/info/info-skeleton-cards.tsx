import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

const fieldTiles = (
  <div className="grid gap-3 lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="space-y-2 rounded-lg border border-border/70 p-3"
      >
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-28" />
      </div>
    ))}
  </div>
);

export const InfoSettingsSkeletonCards = () => (
  <>
    <SectionCard>
      <SectionCardHeader
        title=<Skeleton render={<span />} className="block h-5 w-40" />
        description=<Skeleton
          render=<span />
          className="block h-3 w-64 max-w-full"
        />
        actions=<Skeleton className="h-9 w-28 rounded-xl" />
      />
      <SectionCardContent>{fieldTiles}</SectionCardContent>
    </SectionCard>

    <SectionCard>
      <SectionCardHeader
        title=<Skeleton render={<span />} className="block h-5 w-48" />
        description=<Skeleton
          render=<span />
          className="block h-3 w-72 max-w-full"
        />
      />
      <SectionCardContent className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-5 w-28 rounded-full" />
        ))}
      </SectionCardContent>
    </SectionCard>

    <SectionCard>
      <SectionCardHeader
        title=<Skeleton render={<span />} className="block h-5 w-32" />
      />
      <SectionCardContent>{fieldTiles}</SectionCardContent>
    </SectionCard>
  </>
);
