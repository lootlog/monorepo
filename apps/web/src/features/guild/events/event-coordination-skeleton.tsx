import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const EventCoordinationSkeleton = () => {
  return (
    <div className="flex flex-col gap-4 px-3 py-3">
      <PageHeader
        title={<Skeleton className="h-5 w-40" />}
        description={<Skeleton className="h-3 w-56 max-w-full" />}
      />

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <SectionCard key={index} className="border-border bg-card ">
            <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
            <SectionCardContent>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            </SectionCardContent>
          </SectionCard>
        ))}
      </div>
    </div>
  );
};
