import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const EventRankingSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <PageHeader
        title={<Skeleton className="h-5 w-40" />}
        description={<Skeleton className="h-3 w-56 max-w-full" />}
      />

      <SectionCard className="border-border bg-card ">
        <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
        <SectionCardContent>
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-md" />
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>

      <SectionCard className="border-border bg-card ">
        <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
        <SectionCardContent>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
  );
};
