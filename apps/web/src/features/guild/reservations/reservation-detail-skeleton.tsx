import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const ReservationDetailSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <PageHeader
        title={<Skeleton className="h-5 w-40" />}
        description={<Skeleton className="h-3 w-56 max-w-full" />}
      />

      <SectionCard className="border-border bg-card ">
        <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
        <SectionCardContent>
          <Skeleton className="mb-3 h-5 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>
    </div>
  );
};
