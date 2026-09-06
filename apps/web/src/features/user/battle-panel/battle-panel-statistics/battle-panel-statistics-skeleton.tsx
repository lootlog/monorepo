import { PageHeader } from "@/components/common/page-header";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const BattlePanelStatisticsSkeleton = () => {
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex min-h-full flex-col gap-4 bg-background px-3 py-3">
        <PageHeader
          title={<Skeleton className="h-5 w-40" />}
          description={<Skeleton className="h-3 w-48" />}
        ></PageHeader>

        <SectionCard>
          <SectionCardHeader title={<Skeleton className="h-4 w-32" />} />
          <SectionCardContent></SectionCardContent>
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SectionCard key={i}>
              <SectionCardHeader
                title={<Skeleton className="mb-3 h-5 w-32" />}
              />
              <SectionCardContent>
                <Skeleton className="h-40 w-full rounded-lg" />
              </SectionCardContent>
            </SectionCard>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <SectionCard key={i}>
              <SectionCardHeader
                title={<Skeleton className="mb-3 h-5 w-32" />}
              />
              <SectionCardContent>
                <Skeleton className="h-48 w-full rounded-lg" />
              </SectionCardContent>
            </SectionCard>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};
